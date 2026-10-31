import { redirect } from "next/navigation";

export default function MediathekPage() {
  redirect("/youtube?category=mediathek");
}
