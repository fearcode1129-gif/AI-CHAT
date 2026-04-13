# **React音乐播放器**



## 项目难点（写在简历里面的）

### 一.**全局唯一播放器架构**

#### 面试总结版

音乐播放器和普通页面不同，它要求在路由切换和页面跳转时音频不能中断，所以我没有把播放器写在某个页面组件里，而是把真实的 HTMLAudioElement **提升成全局唯一实例，统一放在 Player.jsx 中**。**页面只负责消费 playerStore** 里的当前歌曲、播放状态、进度和音量，并通过 **store** 触发播放控制。这样列表页、详情页和沉浸式播放页实际上共享的是同一个播放上下文，因此切换页面时音乐不会断，进度、歌词和控制状态也能保持一致。

#### 1.解决方案

我的做法是把播放器拆成**两层**：

**第一层：播放器执行层**:

就是真正的音频实例，只保留一份。持有全局唯一的 **HTMLAudioElement**

```jsx
//Player.jsx#L8
const audioRef = useRef(null);
```

真正的 **<audio>** 在这里挂着：

```jsx
//Player.jsx#L130
<audio
  ref={audioRef}
  onTimeUpdate={handleTimeUpdate}
  onLoadedMetadata={handleLoadedMetadata}
  onEnded={handleEnded}
/>
```

这个组件被放在：[App.jsx#L42](app://-/index.html?hostId=local),**Player** 挂在整个应用的**外层**,不是挂在某个页面路由内部,所以切换页面时它不会被卸载这一步解决的是：**页面切换时播放器不会被销毁。**

------

**第二层：页面展示层**:

页面只负责**“展示播放器状态”**，**不负责真正播放音频**。

例如：底部播放器界面在 [Player.jsx#L137](app://-/index.html?hostId=local),沉浸式播放页在 [NowPlayingPage.jsx#L83](app://-/index.html?hostId=local)

但要注意：**NowPlayingPage.jsx** 本身没有 **<audio>,**它只是从 **store** 里拿当前歌曲、进度、播放状态来渲染黑胶、歌词、控制区

也就是说：**沉浸页是播放器的一个视图，不是另一个播放器。**

#### **2. 播放状态是怎么统一的**

仅有一个全局 **<audio>** 还不够，还要保证所有页面看到的是同一套状态。所以我把播放器状态统一放在[playerStore.js](app://-/index.html?hostId=local)

核心状态包括：

- **currentSongId**：当前歌曲 **id**，[playerStore.js#L55](app://-/index.html?hostId=local)
- **queue**：播放队列，[playerStore.js#L54](app://-/index.html?hostId=local)
- **isPlaying**：是否播放中，[playerStore.js#L56](app://-/index.html?hostId=local)
- **currentTime**：当前进度，[playerStore.js#L59](app://-/index.html?hostId=local)
- **duration**：总时长，[playerStore.js#L60](app://-/index.html?hostId=local)
- **volume**：音量，[playerStore.js#L58](app://-/index.html?hostId=local)
- **playMode**：播放模式，[playerStore.js#L57](app://-/index.html?hostId=local)

这样,底部播放器读的是这份状态,沉浸式播放页读的也是这份状态,详情页歌词同步读的还是这份状态

#### 3. 页面按钮为什么不会直接操作 audio

页面里的按钮不直接写,而是调用 **store** 里的方法,页面里的按钮只是改 **Zustand** 状态。真正调用播放器是**player**执行层,

这说明整个架构是：

1.**页面层负责：用户点击按钮,改全局状态**

**2.Player 执行层负责：监听状态变化,同步到真实 audio 实例**

#### 4.切歌是怎么保证统一的

当用户点一首歌时，不是页面自己去换歌，而是调用

```jsx
//[playerStore.js#L86]
playSong(song, queueSource)
```

这个方法会做几件事：

1. 校验歌曲是否合法
2. 确保歌曲有可播放地址
3. 把歌曲注册进全局曲库
4. 构建当前播放队列
5. 更新：
   - **currentSongId**
   - **queue**
   - **isPlaying**
   - **currentTime**
   - **duration**

然后 **Player.jsx** 监听到：

- **currentSongId**
- **currentAudioUrl**

变化之后，执行

```jsx
//Player.jsx#L39
audio.src = currentAudioUrl;
audio.load();
setPlaybackProgress(0, 0);
```

所以切歌链路是：**页面点击 -> playerStore 更新状态 -> Player.jsx 同步到真实 audio**

#### **5.为什么进度不会丢**

 播放进度不是页面自己记的，而是由**全局音频实例持续回写到 store**。

代码在：

```jsx
//Player.jsx#L96
const handleTimeUpdate = () => {
  setPlaybackProgress(audio.currentTime || 0, audio.duration || 0);
};
```

写入的是：

```jsx
//playerStore.js#L256
setPlaybackProgress(nextTime, nextDuration)
```

底部播放器读 **currentTime**，沉浸页读 **currentTime**，歌词高亮也读 **currentTime**

所以切换页面的时候：进度不是重新算一份，而是所有页面都读全局这一个值，这就是为什么进度条和歌词能够同步。

### **二：沉浸式播放页中歌词与播放进度同步问题**

#### 面试总结版

沉浸式播放页里的歌词同步，核心不是把歌词显示出来，而是要解决歌词时间轴、播放进度和页面展示之间的联动问题。我的做法是先把接口返回的 LRC 文本通过 parseLrc 解析成 { time, text } 结构，再由全局播放器在 timeupdate 时把真实播放进度写入 playerStore，沉浸式播放页读取这份 currentTime 传给 LyricsPanel。LyricsPanel 会根据当前时间计算当前高亮行，并在当前句变化时通过 scrollIntoView 自动滚动歌词容器。后面我又把歌词缓存从 songCatalog 中拆出来，避免歌词加载触发整份曲库重算，降低了状态联动成本。这样最终实现了歌词高亮、自动滚动和播放进度同步的一体化体验。

#### 1.真实播放器场景的问题，首先是**4**类问题：

```text
//lrc文本结构
[00:12.00]第一句
[00:18.50]第二句
[00:25.20]第三句
```

**1. 歌词不是静态文本**，接口返回的歌词通常是 **LRC 文本**，这类文本不能直接用来做高亮，因为播放器只能拿到一个实时变化的播放时间 **currentTime**，所以必须先把**歌词转成结构化时间轴数据**。

**2. 当前播放到哪一句，不能靠行号判断**，歌词每一句出现的时间不同：有的句子间隔短	有的句子间隔长	用户还可能拖动进度条，所以不能写死“**第几秒对应第几行**”，必须**根据实时播放时间动态计算当前句**。

**3. 只高亮还不够，还要滚动**，歌词除了高亮，还必须自动滚动，把**当前句保持在可视区域中间**附近。

**4. 歌词逻辑不能直接绑在某个页面上**，沉浸式播放页只是播放器的一种**视图**，如果歌词同步逻辑写死在页面里，后面详情页复用歌词时会很难维护。所以歌词逻辑必须尽量做成：**独立解析	独立缓存	独立展示	由全局播放进度驱动**

#### **2.解决方案**

我把歌词同步这件事拆成了四层：

1. **LRC 解析层**：负责把原始歌词字符串转成**时间轴数组**
2. **全局播放进度层**：由**全局播放器**持续更新 **currentTime**
3. **歌词计算层**：根据 **currentTime** 计算当前应该高亮的歌词行
4. **歌词展示层**：根据当前行做**样式高亮**和**自动滚动**

也就是说，整个链路是：

**audio 播放进度 -> playerStore.currentTime -> LyricsPanel 计算 activeIndex -> 高亮 + 自动滚动**

#### **3.代码实现**

**1.**[parseLrc.js](app://-/index.html?hostId=local)用来把lrc文本结构拆解**时间轴数组**

**2.**播放器持续把**真实进度**写入**全局状态**，对应文件：[Player.jsx](app://-/index.html?hostId=local)，[playerStore.js](app://-/index.html?hostId=local)

在全局播放器里，真实的 **<audio>** 会触发 **timeupdate**

**3.**沉浸页把**全局进度**传给**歌词组件**

沉浸页会从 **playerStore** 中读取：**currentTime	duration	isPlaying	currentSongId**

然后把歌词和进度一起传给 **LyricsPanel**

```jsx
//NowPlayingPage.jsx#L116-L123
<LyricsPanel
  lyrics={lyrics}
  currentTime={currentTime}
  isSyncEnabled={Boolean(currentSong)}
  loading={lyricsLoading}
  error={lyricsError}
  variant="immersive"
/>
```

**4.**LyricsPanel 根据 currentTime 计算当前句

这里有个核心函数

```jsx
//LyricsPanel.jsx#L3-L19
const resolveActiveIndex = (lyrics, currentTime) => {
  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return -1;
  }

  let activeIndex = 0;

  for (let index = 0; index < lyrics.length; index += 1) {
    if (currentTime >= lyrics[index].time) {
      activeIndex = index;
    } else {
      break;
    }
  }

  return activeIndex;
};

```

它会遍历歌词数组，找到**最后一个 line.time <= currentTime 的歌词项**这个索引就是当前应该高亮的歌词行。如果面试官提问除了每次遍历所有数组还有什么解决方案，**二分查找**

**5.**用 useMemo 实时计算 activeIndex

```jsx
//LyricsPanel.jsx#L31
const activeIndex = useMemo(
  () => resolveActiveIndex(lyrics, currentTime),
  [lyrics, currentTime]
);
```

**6.**当前句变化时自动滚动

```jsx
useEffect(() => {
  if (!isSyncEnabled || !activeLineRef.current || !listRef.current) {
    return;
  }

  activeLineRef.current.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}, [activeIndex, isSyncEnabled]);

```

**7.**歌词缓存从 songCatalog 独立拆分

### **三：性能问题**

#### **优化方案**

这个项目的性能优化主要集中在首页推荐、歌词同步和搜索交互三个场景。首页推荐的**问题是首屏请求规模大、页面等待时间长**，所以我在 libraryStore 的 loadCatalog 中做了**缓存优先渲染**，先展示已有 songCatalog，再后台刷新，同时在推荐数据组装层控制了种子搜索规模和首屏展示数量，降低了首页首屏成本。

歌词同步的**问题是歌词请求和播放器状态联动频繁**，如果把歌词直接写回主曲库，会放大全局重渲染。所以我把歌词拆成 **lyricsBySongId 独立缓存**，在 NowPlayingPage 和 SongDetailPage 中按需读取，没缓存时才请求并写入缓存，从而减少重复请求和无效渲染。

搜索交互的**问题是输入、建议、收藏状态和播放状态**都可能同时影响列表更新，所以我在列表页对全局状态做了**按需订阅**，同时对输入值使用 **useDeferredValue 延迟消费**，降低了搜索建议和结果计算的同步压力。最终首页首屏展示更快，播放页切换和歌词同步也更流畅。

#### useDeferredValue为什么比debounce更合适

**useDeferredValue** 是 **React 官方 Hook**。我在搜索页里用它来延迟消费输入值，让输入框更新保持高优先级，而搜索建议和结果计算稍后同步，从而降低高频输入时的页面抖动和同步渲染压力。

### **四：推荐功能的实现**

#### 面试总结

是一套轻量级推荐引擎。先通过搜索、播放、有效播放和收藏行为**采集用户兴趣**，再把这些行为转成歌手、风格、关键词和歌曲四个维度的**偏好画像**。为了避免旧兴趣长期主导推荐，我给画像信号加了时间衰减。然后再根据高权重歌手和关键词去搜索接口做**候选召回**，拿到新的推荐候选。排序阶段综合考虑歌手匹配、风格匹配、关键词命中和单曲偏好，同时加入**同歌手数量限制**，避免推荐结果过于单一。**最后通过默认推荐和个性化推荐混排**，实现冷启动阶段保留默认内容、行为积累后逐渐提升个性化占比的效果。为了保证交互流畅，我还给**推荐刷新加了节流**，避免高频操作触发重复重建。

#### 1.设计思路

我把这套推荐拆成 5 层：

1. **行为采集**
2. **用户画像**
3. **候选召回**
4. **个性化排序**
5. **混排与多样性控制**

#### 2. 推荐画像的核心状态

```jsx
//recommendStore.js
profilesByUser: {},//存累计偏好画像
signalMetaByUser: {},//存每类信号的 score + lastUpdatedAt 用来做时间衰减
homeFeedByUser: {},//存最终首页推荐结果
```

#### 3. 行为采集：搜索 / 播放 / 收藏

**搜索**

```jsx
recordSearch(keyword) {
  const userId = getCurrentUserId();
  const normalizedKeyword =normalizeText(keyword);//标准化关键词

  if (!userId || !normalizedKeyword) {
    return;
  }

  const timestamp = getCurrentTimestamp();//构建时间戳

  set((state) => {//改全局状态里的用户画像数据
    const currentProfile = state.profilesByUser[userId] || createEmptyProfile();//取当前用户画像
    const currentSignalMeta = getProfileMeta(state, userId);//取当前信号元数据
    const nextProfile = buildNextProfile(currentProfile, (draft) => {
      draft.keywords = applyScore(draft.keywords, normalizedKeyword, KEYWORD_WEIGHT);//在当前用户画像的基础上，把这次搜索词加进去，并按 KEYWORD_WEIGHT 更新分数
    });
    const nextSignalMeta = buildNextSignalMeta(currentSignalMeta, (draft) => {
      draft.keywords = applySignalMeta(draft.keywords, normalizedKeyword, KEYWORD_WEIGHT, timestamp);
    });

    return {
      profilesByUser: {
        ...state.profilesByUser,//保留其他用户的数据不变,只替换当前 userId 对应的画像和元数据
        [userId]: nextProfile
      },
      signalMetaByUser: {
        ...state.signalMetaByUser,
        [userId]: nextSignalMeta
      }
    };
  });

  get().scheduleHomeFeedRefresh(undefined, FEED_REFRESH_THROTTLE_MS);//搜索行为已经更新了用户兴趣，所以首页推荐内容刷新
}

```

**播放行为**

```jsx
const weight = options.engaged ? PLAY_WEIGHT + ENGAGED_PLAY_WEIGHT : PLAY_WEIGHT;//如果这次播放是“高参与度播放” (options.engaged === true),权重更高,否则就是普通播放权重
const artistNames = splitArtistNames(song.artist);//解析歌手名,并转化成一个数组
const genre = normalizeText(song.genre);//标准化
draft.songs = applyScore(draft.songs, song.id, weight);
artistNames.forEach((artist) => {
  draft.artists = applyScore(draft.artists, artist, weight);//给歌手加权重
});

if (genre) {
  draft.genres = applyScore(draft.genres, genre, Math.max(2, Math.round(weight / 2)));//给歌曲种类加权重
}

```

**收藏行为**

```jsx
//recordFavoriteToggle(song, willBeFavorite)
const delta = willBeFavorite ? FAVORITE_WEIGHT : -FAVORITE_WEIGHT;//如果用户收藏就加上权重，如果取消就删除权重
draft.songs = applyScore(draft.songs, song.id, delta);//给歌曲附上权重
artistNames.forEach((artist) => {
  draft.artists = applyScore(draft.artists, artist, delta);//给歌手附上权重
});

if (genre) {
  draft.genres = applyScore(draft.genres, genre, Math.round(delta / 2));//给作品类别附上权重
}
```

#### 4.时间衰减核心代码

```jsx
const getDecayedScore = (entry, now = getCurrentTimestamp()) => {
  if (!entry) {
    return 0;
  }

  const rawScore = Number(entry.score || 0);
  const lastUpdatedAt = Number(entry.lastUpdatedAt || now);
  const ageMs = Math.max(0, now - lastUpdatedAt);计算现在距离多少时间
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decay = Math.pow(0.5, ageDays / PROFILE_HALF_LIFE_DAYS);//这是一个半衰期衰减
  return rawScore * decay;
};
```

#### 5. 候选召回核心代码

```jsx
const topArtists = getTopSignalKeys(profileMeta.artists, 2, now);//获取top-2的歌手
const topKeywords = getTopSignalKeys(profileMeta.keywords, 3, now).filter(
  (keyword) => !topArtists.includes(keyword)//过滤已经重复的歌手
);
const recallQueries = [...topArtists, ...topKeywords].slice(0, MAX_RECALL_QUERIES);
```

```jsx
const results = await Promise.allSettled(//allSettled是因为不要因为一个失败而不返回
  recallQueries.map((query) =>//对每个召回 query 都发一次搜歌请求，并且并行执行；不管某个请求成功还是失败，全部等它们结束。
    searchSongs(query, {
      limit: RECALL_QUERY_LIMIT,//限制多少首
      offset: 0//第几页开始
    })
  )
);
return mergeUniqueSongs(
  ...results.map((result) =>
    result.status === 'fulfilled' && Array.isArray(result.value?.songs) ? result.value.songs : EMPTY_ARRAY//从所有搜索结果里，只取成功且格式正确的歌曲数组；失败的就当空数组；最后把这些数组合并并去重
  )
);
```

#### **6.个性化打分核心代码**

```jsx
const artistScore = artistNames.reduce(
  (sum, artist) => sum + getDecayedScore(profileMeta.artists?.[artist], now),
  0//看这首歌的所有歌手，在用户画像里分别有多少分，然后加起来
);
const genreScore = getDecayedScore(profileMeta.genres?.[genre], now);//看这首歌所属类别，在用户画像里当前还有多少兴趣分
const songScore = getDecayedScore(profileMeta.songs?.[song?.id], now);//直接看用户对“这首歌本身”有没有历史偏好分
const keywordScore = Object.entries(profileMeta.keywords || EMPTY_OBJECT).reduce(
  (sum, [keyword, entry]) => {//遍历用户画像里的所有关键词，看这首歌的标题、专辑、流派、描述、歌手名里有没有命中这些关键词；命中了就把该关键词的分数加进来
    if (
      title.includes(keyword) ||
      album.includes(keyword) ||
      genre.includes(keyword) ||
      description.includes(keyword) ||
      artistNames.some((artist) => artist.includes(keyword))
    ) {
      return sum + getDecayedScore(entry, now);
    }

    return sum;
  },
  0
);

const defaultScore = Math.max(0, 120 - originalIndex * 2);//初始化分数

return artistScore * 7 + genreScore * 3 + keywordScore * 5 + songScore * 9 + defaultScore;

```

#### **7.混排策略核心代码**

```jsx
const MIX_PATTERN = ['personalized', 'default', 'personalized', 'personalized', 'default'];//这是我对排序的一个测略 个性化+默认
const targetPool = MIX_PATTERN[patternIndex % MIX_PATTERN.length] === 'personalized'//看当前轮到模式里的哪一种，如果是 personalized，就从个性化候选池取；否则从默认候选池取
  ? personalizedCandidates
  : defaultCandidates;
```

### **五：扩展问题**

#### 1:你现在是全局唯一播放器架构，如果以后要支持多个播放源，比如本地 mock、业务后端音频、第三方音源，你会怎么扩展？

我会把当前直接依赖 `HTMLAudioElement` 的实现再往上抽一层，拆成两层,第一层是**播放器内核层**，负责统一暴露能力,第二层是**音源适配层**，不同来源的歌曲都先被标准化成统一的 track model

#### 2.现在只有一个 `HTMLAudioElement`，如果未来要支持“无缝切歌”“淡入淡出”“预加载下一首”，现有架构够吗？怎么演进？

只保留一个真实播放器实例适合当前场景，但如果要支持更强的播放体验，单实例会成为限制。我的演进思路是从“单实例”升级成“**主播放实例 + 预加载实例**”的双实例模型。主实例负责当前播放，预加载实例只负责提前加载下一首资源，不直接出声，切歌时把预加载实例提升为主实例，再创建新的预加载实例

#### 3.你的推荐系统已经有行为采集和画像了。如果以后用户行为维度越来越多，怎么避免 recommendStore 变成巨石模块？

**行为采集层**只负责记录事件，不负责算推荐

**画像构建层**从行为日志中生成用户偏好画像，比如：歌手偏好分	风格偏好分	关键词偏好分	单曲偏好分

**候选召回层**基于画像从曲库中召回候选集合

**排序与多样性控制层**负责：时间衰减	权重融合	去重	同歌手曝光限制	混排策略

**缓存层**	负责缓存推荐结果、上次计算时间、脏标记

#### 4.如果歌曲量从几十首变成几万首，你的搜索和推荐还能撑住吗？会怎么扩展？

**搜索**

从前端全量模糊搜索，升级成：

- 服务端搜索接口为主
- 前端保留搜索历史和少量热门建议缓存
- 输入防抖、结果分页、关键词高亮仍在前端做

**推荐**

前端不再对全量曲库做复杂打分，而是：

- 服务端先召回候选
- 前端只做轻量混排和展示优化
