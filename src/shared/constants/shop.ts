export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'frame_gold', name: 'Zlatý rám avataru', desc: 'Prémiový zlatý rámeček', price: 120 },
  { id: 'frame_silver', name: 'Stříbrný rám avataru', desc: 'Elegantní stříbrný rámeček', price: 60 },
  { id: 'fx_confetti', name: 'Efekt: Konfety', desc: 'Animace při výhře', price: 80 },
];
