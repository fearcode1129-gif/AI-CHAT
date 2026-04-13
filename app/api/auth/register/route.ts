import bcrypt from "bcryptjs";

import { db } from "@/lib/server/db";

export const runtime = "nodejs";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

function validateName(name: string) {
  return name.trim().length >= 2 && name.trim().length <= 40;
}

function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 72;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RegisterBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!validateName(name)) {
      return Response.json({ error: "Name must be between 2 and 40 characters." }, { status: 400 });
    }

    if (!email || !email.includes("@")) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return Response.json({ error: "Password must be between 8 and 72 characters." }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return Response.json({ error: "This email address is already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        plan: "free"
      }
    });

    return Response.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
