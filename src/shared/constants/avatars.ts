// Výchozí kolekce avatarů pro onboarding

export interface AvatarDef {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_AVATARS: AvatarDef[] = [
  { id: 'cat', name: 'Kočka', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { id: 'dog', name: 'Pes', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { id: 'robot', name: 'Robot', url: 'https://cdn-icons-png.flaticon.com/512/4712/4712104.png' },
  { id: 'ghost', name: 'Duch', url: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { id: 'ninja', name: 'Ninja', url: 'https://cdn-icons-png.flaticon.com/512/4712/4712135.png' },
];
