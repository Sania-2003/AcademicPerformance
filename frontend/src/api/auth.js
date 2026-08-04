import api from "./client";

export async function login(username, password) {
  const response = await api.post("/login/", { username, password });
  return response.data;
}

export async function logout() {
  await api.post("/logout/");
}

