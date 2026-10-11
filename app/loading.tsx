import { RouteSkeleton } from '@/components/skeleton/RouteSkeleton';

// Shown inside <main> while a route's server render is on its way (option E, "answer skeleton").
export default function Loading() {
  return <RouteSkeleton />;
}
