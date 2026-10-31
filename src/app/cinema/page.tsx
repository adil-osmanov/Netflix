import { redirect } from "next/navigation";

export default function CinemaPage() {
  redirect("/youtube?category=cinema");
}
