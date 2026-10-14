import { MOCK_USERS } from "./mockData";
import { User } from "./types";

export const login = (email: string, password: string): User | null => {
  const user = MOCK_USERS.find(
    (u) => u.email === email && u.password === password,
  );

  if (user) {
    if (typeof window !== "undefined") {
      const { password: _, ...userWithoutPassword } = user;
      localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));
    }
    return user as User;
  }

  return null;
};

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser");
  }
};

export const getCurrentUser = (): User | null => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("currentUser");
    if (user) {
      return JSON.parse(user) as User;
    }
  }

  return null;
};
