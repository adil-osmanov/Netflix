// Дефолтная ссылка на кинотеатр. 
// Чтобы сменить ссылку: просто замени строку ниже или пропиши NEXT_PUBLIC_CINEMA_URL в .env.local
export const DEFAULT_CINEMA_URL = 'https://cinejoy.pk/';

export function getCinemaUrl(): string {
  if (typeof window !== 'undefined') {
    // Если пользователь вручную ввел новое зеркало в приложении, берем его из LocalStorage
    const customUrl = localStorage.getItem('custom_cinema_url');
    if (customUrl && customUrl.trim().startsWith('http')) {
      return customUrl.trim();
    }
  }
  return process.env.NEXT_PUBLIC_CINEMA_URL || DEFAULT_CINEMA_URL;
}
