import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function RootPage() {
  const cookieStore = await cookies();
  const lastVisitedPage = cookieStore.get('lastVisitedPage')?.value;

  redirect(lastVisitedPage || '/about');
}