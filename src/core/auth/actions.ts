"use server";

import { signOut } from "./next-auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
