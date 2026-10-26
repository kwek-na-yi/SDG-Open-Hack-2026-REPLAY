/**
 * Seeded marketplace catalogue: product photos, the Product type and the
 * pre-owned items shown on Discover alongside users' own listings.
 */
import { calculateCircularValue, type Category, type Material } from '../lib/engine'

const u = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`

export const IMG = {
  denimJacket: u('1495105787522-5334e3ffa0ef'),
  bomberJacket: u('1591047139829-d91aecb6caea'),
  leatherJacket: u('1551028719-00167b16eac5'),
  leatherJacketModel: u('1520975954732-35dd22299614'),
  windbreaker: u('1523398002811-999ca8dec234'),
  greyHoodie: u('1556821840-3a63f95609a7'),
  whiteSweat: u('1620799140408-edc6dcb6d633'),
  orangeSweat: u('1578587018452-892bacefd3f2'),
  graphicTee: u('1576566588028-4147f3842f27'),
  blackTee: u('1618354691373-d851c5c3a990'),
  oversizedTee: u('1622519407650-3df9883f76a5'),
  whiteTee: u('1521572163474-6864f9cf17ab'),
  greenTees: u('1523381210434-271e8be1f52b'),
  dressShirt: u('1598033129183-c4f50c736f10'),
  jeansRack: u('1576995853123-5a10305d93c0'),
  jeansStack: u('1604176354204-9268737828e4'),
  jeansFolded: u('1542272604-787c3835535d'),
  rippedJeans: u('1582552938357-32b906df40cb'),
  joggers: u('1594633312681-425c7b97ccd1'),
  knit: u('1434389677669-e08b4cac3105'),
  backpack: u('1553062407-98eeb64c6a62'),
  redBag: u('1584917865442-de89df76afd3'),
  greyBag: u('1559563458-527698bf5295'),
  redSneaker: u('1542291026-7eec264c27ff'),
  voltSneaker: u('1606107557195-0e29a4b5b4aa'),
  colourSneakers: u('1560769629-975ec94e6a86'),
  brownShoes: u('1614252235316-8c857d38b5f4'),
  flatlay: u('1544441893-675973e31985'),
  rack: u('1612423284934-2850a4ea6b0f'),
  storefront: u('1485518882345-15568b007407', 1400),
  printShirt: u('1596755094514-f87e34085b2c'),
  shirtTrio: u('1602810318383-e386cc2a3ccf'),
  plainBlackTee: u('1583743814966-8936f5b7be1a'),
  skaterSkirt: u('1583496661160-fb5886a0aaaa'),
  joggerSet: u('1515886657613-9f3515b0c78f'),
  floralDress: u('1572804013309-59a88b7e92f1'),
  maxiDress: u('1595777457583-95e059d581b8'),
  wrapDress: u('1539008835657-9e8e9680c956'),
  tanSneaker: u('1549298916-b41d501d3772'),
  airRunner: u('1600185365483-26d7a4cc7519'),
  courtSneaker: u('1608231387042-66d1773070a5'),
  pastelSneaker: u('1595950653106-6c9ebd614d3a'),
  floralHeels: u('1543163521-1bf539c55dd2'),
  rawJeans: u('1624378439575-d8705ad7ae80'),
  chinos: u('1473966968600-fa801b869a1a'),
  chambrayDress: u('1591369822096-ffd140ec948f'),
  blueTee: u('1564584217132-2271feaeb3c5'),
  truckerJacket: u('1611312449408-fcece27cdbb7'),
  utilityJacket: u('1544022613-e87ca75a784a'),
  camelCoat: u('1539533018447-63fcce2678e3'),
  puffer: u('1548624313-0396c75e4b1a'),
  blazer: u('1617137968427-85924c800a22'),
  pinkBag: u('1566150905458-1bf1fc113f0d'),
  wallet: u('1627123424574-724758594e93'),
  cutoffs: u('1591195853828-11db59a44f6b'),
  camis: u('1525171254930-643fc658b64e'),
  straightJeans: u('1598554747436-c9293d6a588f'),
  blouse: u('1583846717393-dc2412c95ed7'),
  whiteShirt: u('1603252109303-2751441dd157'),
  skyShirt: u('1620012253295-c15cc3e65df4'),
  knitSweater: u('1631541909061-71e349d1f203'),
  skateShoes: u('1525966222134-fcfa99b8ae77'),
  navyHeels: u('1515347619252-60a4bf4fff4f'),
}

export type Rarity = 'Common' | 'Limited' | 'Rare'

/** What the AI reads off a second-hand garment. All optional — sensible defaults are derived. */
export interface GarmentAttrs {
  garment?: string
  colourName?: string
  colourHex?: string
  size?: string
  pattern?: string
  style?: string
}
export type Section = 'resale' | 'creator' | 'materials'

/** What shoppers filter by on Discover. */
export type Kind = 'T-shirts & tops' | 'Shirts' | 'Hoodies & knitwear' | 'Jackets & coats' | 'Jeans & trousers' | 'Skirts & shorts' | 'Dresses' | 'Shoes' | 'Bags & accessories'
export const KINDS: Kind[] = ['T-shirts & tops', 'Shirts', 'Hoodies & knitwear', 'Jackets & coats', 'Jeans & trousers', 'Skirts & shorts', 'Dresses', 'Shoes', 'Bags & accessories']
const CATEGORY_KIND: Record<Category, Kind> = {
  shirt: 'T-shirts & tops',
  hoodie: 'Hoodies & knitwear',
  knitwear: 'Hoodies & knitwear',
  jacket: 'Jackets & coats',
  denim: 'Jeans & trousers',
  trousers: 'Jeans & trousers',
  skirt: 'Skirts & shorts',
  dress: 'Dresses',
  sneaker: 'Shoes',
  bag: 'Bags & accessories',
}
export const kindOf = (p: { category: Category; kind?: Kind }): Kind => p.kind ?? CATEGORY_KIND[p.category]

export interface Product extends GarmentAttrs {
  id: string
  /** Overrides the shopping type derived from category (e.g. a shirt that is a dress shirt) */
  kind?: Kind
  name: string
  brand: string
  img: string
  section: Section
  category: Category
  material: Material
  originalPrice: number
  price: number
  condition: number
  demand: number
  age: number
  rarity: Rarity
  /** Lives already lived (1 = first owner) */
  life: number
  conditionLabel: string
  size?: string
  seller?: string
  /** Optional fixed values for curated/showcase items */
  fixed?: { resale?: number; transform?: number; material?: number }
  /** Set on items listed by a RE:PLAY user (see lib/account.ts) */
  sellerId?: string
  description?: string
  listingStatus?: 'active' | 'sold' | 'removed'
}

export function valuate(p: Pick<Product, 'originalPrice' | 'condition' | 'demand' | 'age' | 'category' | 'material' | 'brand' | 'fixed'>) {
  const v = calculateCircularValue(p)
  return {
    ...v,
    resaleValue: p.fixed?.resale ?? v.resaleValue,
    transformationValue: p.fixed?.transform ?? v.transformationValue,
    materialValue: p.fixed?.material ?? v.materialValue,
  }
}

export const PRODUCTS: Product[] = [
  { id: 'p-levis-jacket', name: "Levi's Denim Jacket", brand: "Levi's", img: IMG.denimJacket, section: 'resale', category: 'jacket', material: 'denim', originalPrice: 89, price: 25, condition: 0.85, demand: 0.3, age: 0.3, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — like new', size: 'M (oversized)', seller: '@mei.tan', fixed: { resale: 41, transform: 63, material: 12 }, garment: 'oversized denim jacket', colourName: 'Light-wash blue', colourHex: '#8fb3d6', pattern: 'Light wash', style: 'Casual' },
  { id: 'p-nike-hoodie', name: 'Pre-loved Nike Hoodie', brand: 'Nike', img: IMG.greyHoodie, section: 'resale', category: 'hoodie', material: 'cotton', originalPrice: 90, price: 24, condition: 0.95, demand: 0.6, age: 0.9, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — like new', size: 'M', seller: '@jun.lim', fixed: { resale: 39 }, garment: 'grey hoodie', colourName: 'Heather grey', colourHex: '#a9adb0', style: 'Streetwear' },
  { id: 'p-bomber', name: 'Rust Satin Bomber', brand: 'NOVAWEAR', img: IMG.bomberJacket, section: 'resale', category: 'jacket', material: 'polyester', originalPrice: 129, price: 38, condition: 0.9, demand: 0.65, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — excellent', size: 'L', seller: 'NOVAWEAR Take-back', garment: 'satin bomber jacket', colourName: 'Rust', colourHex: '#b5613a', style: 'Streetwear' },
  { id: 'p-leather', name: 'Moto Leather Jacket', brand: 'LOOPFORM', img: IMG.leatherJacket, section: 'resale', category: 'jacket', material: 'leather', originalPrice: 320, price: 118, condition: 0.85, demand: 0.75, age: 0.3, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — A grade', size: 'M', seller: 'RE:PLAY Take-back', garment: 'leather moto jacket', colourName: 'Black', colourHex: '#232120', style: 'Streetwear' },
  { id: 'p-levis-jeans', name: "Levi's 501 Stonewash", brand: "Levi's", img: IMG.jeansFolded, section: 'resale', category: 'denim', material: 'denim', originalPrice: 109, price: 26, condition: 0.8, demand: 0.7, age: 0.6, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: '32/32', seller: 'RE:PLAY Take-back', garment: 'stonewash jeans', colourName: 'Stonewash blue', colourHex: '#6a8fb8', pattern: 'Stonewash', style: 'Vintage' },
  { id: 'p-volt', name: 'Volt Training Runner', brand: 'Nike', img: IMG.voltSneaker, section: 'resale', category: 'sneaker', material: 'blend', originalPrice: 150, price: 49, condition: 0.95, demand: 0.7, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — worn twice', size: 'US 9', seller: '@hafiz.r', garment: 'training sneakers', colourName: 'Volt', colourHex: '#c6e33a', style: 'Streetwear' },
  { id: 'p-red-runner', name: 'Crimson Air Runner', brand: 'Nike', img: IMG.redSneaker, section: 'resale', category: 'sneaker', material: 'blend', originalPrice: 170, price: 64, condition: 0.9, demand: 0.85, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — very good', size: 'US 10', seller: '@priya.k', garment: 'running sneakers', colourName: 'Crimson', colourHex: '#b8262f', style: 'Streetwear' },
  { id: 'p-orange-crew', name: 'Tangerine Crewneck', brand: 'THREADLAB', img: IMG.orangeSweat, section: 'resale', category: 'knitwear', material: 'cotton', originalPrice: 69, price: 17, condition: 0.9, demand: 0.55, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — good', size: 'S', seller: 'THREADLAB Take-back', garment: 'crewneck sweatshirt', colourName: 'Tangerine', colourHex: '#e8883a', style: 'Casual' },
  { id: 'p-backpack', name: 'Commuter Backpack 22L', brand: 'URBAN/01', img: IMG.backpack, section: 'resale', category: 'bag', material: 'nylon', originalPrice: 119, price: 34, condition: 0.95, demand: 0.6, age: 0.3, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', seller: '@mei.tan', garment: 'backpack', colourName: 'Midnight navy', colourHex: '#2c3a55', style: 'Functional' },
  { id: 'p-grey-bag', name: 'Studded Shoulder Bag', brand: 'LOOPFORM', img: IMG.greyBag, section: 'resale', category: 'bag', material: 'leather', originalPrice: 240, price: 72, condition: 0.9, demand: 0.7, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — excellent', seller: 'Consumer resale', garment: 'shoulder bag', colourName: 'Dove grey', colourHex: '#b9bec3', style: 'Elegant' },
  { id: 'p-windbreaker', name: '90s Colour-block Windbreaker', brand: 'Adidas', img: IMG.windbreaker, section: 'resale', category: 'jacket', material: 'nylon', originalPrice: 110, price: 29, condition: 0.75, demand: 0.8, age: 1, rarity: 'Rare', life: 3, conditionLabel: 'Vintage — good', size: 'L', seller: 'Consumer resale', garment: 'windbreaker', colourName: 'Navy & yellow', colourHex: '#2f3f6b', style: 'Vintage' },
  { id: 'p-oxford', name: 'Oxford Dress Shirt', brand: 'NOVAWEAR', img: IMG.dressShirt, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 79, price: 15, condition: 0.95, demand: 0.45, age: 0.6, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — like new', size: '15.5', seller: 'NOVAWEAR Take-back', kind: 'Shirts', garment: 'oxford shirt', colourName: 'White', colourHex: '#f1f0ec', style: 'Minimal' },
  { id: 'p-brogues', name: 'Tan Leather Derbies', brand: 'LOOPFORM', img: IMG.brownShoes, section: 'resale', category: 'sneaker', material: 'leather', originalPrice: 189, price: 52, condition: 0.85, demand: 0.5, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — light wear', size: 'EU 42', seller: 'RE:PLAY Take-back', garment: 'leather derbies', colourName: 'Tan', colourHex: '#8a4f28', style: 'Elegant' },

  { id: 'p-black-tee', name: "Essential Black Tee", brand: "URBAN/01", img: IMG.plainBlackTee, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 45, price: 9, condition: 0.85, demand: 0.6, age: 0.4, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: 'L', seller: '@ryan.ong', garment: "black cotton tee", colourName: 'Black', colourHex: '#1f1f1f', style: 'Minimal' },
  { id: 'p-blue-tee', name: "Washed Sky Tee", brand: "THREADLAB", img: IMG.blueTee, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 35, price: 7, condition: 0.8, demand: 0.55, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — good', size: 'S', seller: '@mei.tan', garment: "washed cotton tee", colourName: 'Powder blue', colourHex: '#a9c1d9', style: 'Casual' },
  { id: 'p-camis', name: "Ribbed Cami Set ×3", brand: "NOVAWEAR", img: IMG.camis, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 60, price: 12, condition: 0.85, demand: 0.65, age: 0.4, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — like new', size: 'M', seller: 'NOVAWEAR Take-back', garment: "ribbed camisoles", colourName: 'Monochrome', colourHex: '#8c8c8c', style: 'Minimal' },
  { id: 'p-blouse', name: "Pussy-bow Blouse", brand: "LOOPFORM", img: IMG.blouse, section: 'resale', category: 'shirt', material: 'polyester', originalPrice: 89, price: 21, condition: 0.9, demand: 0.6, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — excellent', size: 'S', seller: '@priya.k', garment: "satin blouse", colourName: 'Ivory', colourHex: '#f1ede4', style: 'Elegant' },
  { id: 'p-print-shirt', name: "Micro-print Chambray Shirt", brand: "LOOPFORM", img: IMG.printShirt, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 79, price: 18, condition: 0.85, demand: 0.6, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'M', seller: '@jun.lim', kind: 'Shirts', garment: "chambray shirt", colourName: 'Chambray blue', colourHex: '#5c7894', pattern: 'Micro-print', style: 'Casual' },
  { id: 'p-shirt-trio', name: "Oxford Shirt Trio", brand: "NOVAWEAR", img: IMG.shirtTrio, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 180, price: 36, condition: 0.85, demand: 0.55, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: '15.5', seller: 'NOVAWEAR Take-back', kind: 'Shirts', garment: "oxford shirts", colourName: 'Grey, white & plum', colourHex: '#6d6b73', style: 'Minimal' },
  { id: 'p-white-shirt', name: "Crisp White Shirt", brand: "THREADLAB", img: IMG.whiteShirt, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 69, price: 14, condition: 0.9, demand: 0.6, age: 0.4, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — like new', size: 'M', seller: '@hafiz.r', kind: 'Shirts', garment: "white poplin shirt", colourName: 'White', colourHex: '#f3f2ee', style: 'Minimal' },
  { id: 'p-sky-shirt', name: "Sky Blue Dress Shirt", brand: "NOVAWEAR", img: IMG.skyShirt, section: 'resale', category: 'shirt', material: 'cotton', originalPrice: 85, price: 17, condition: 0.85, demand: 0.5, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: '16', seller: '@ryan.ong', kind: 'Shirts', garment: "dress shirt", colourName: 'Sky blue', colourHex: '#9dc1e6', style: 'Elegant' },
  { id: 'p-knit', name: "Chunky Knit Sweater", brand: "THREADLAB", img: IMG.knitSweater, section: 'resale', category: 'knitwear', material: 'wool', originalPrice: 110, price: 26, condition: 0.85, demand: 0.6, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'M', seller: '@mei.tan', garment: "chunky knit sweater", colourName: 'Oatmeal', colourHex: '#b8a58a', pattern: 'Cable knit', style: 'Vintage' },
  { id: 'p-trucker', name: "Cord-collar Trucker Jacket", brand: "Levi's", img: IMG.truckerJacket, section: 'resale', category: 'jacket', material: 'denim', originalPrice: 129, price: 38, condition: 0.85, demand: 0.7, age: 0.5, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — excellent', size: 'L', seller: '@jun.lim', garment: "dark denim trucker jacket", colourName: 'Indigo', colourHex: '#2f3e5c', pattern: 'Raw indigo', style: 'Vintage' },
  { id: 'p-utility', name: "Olive Utility Jacket", brand: "URBAN/01", img: IMG.utilityJacket, section: 'resale', category: 'jacket', material: 'cotton', originalPrice: 139, price: 34, condition: 0.8, demand: 0.65, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'M', seller: '@hafiz.r', garment: "cotton utility jacket", colourName: 'Olive', colourHex: '#5d5a3c', style: 'Streetwear' },
  { id: 'p-camel-coat', name: "Camel Belted Coat", brand: "LOOPFORM", img: IMG.camelCoat, section: 'resale', category: 'jacket', material: 'wool', originalPrice: 260, price: 68, condition: 0.85, demand: 0.6, age: 0.5, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — excellent', size: 'S', seller: '@priya.k', garment: "wool coat", colourName: 'Camel', colourHex: '#a9784a', style: 'Elegant' },
  { id: 'p-puffer', name: "Sunshine Puffer Jacket", brand: "URBAN/01", img: IMG.puffer, section: 'resale', category: 'jacket', material: 'nylon', originalPrice: 180, price: 42, condition: 0.85, demand: 0.55, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'M', seller: '@mei.tan', garment: "puffer jacket", colourName: 'Sunshine yellow', colourHex: '#e8b423', style: 'Streetwear' },
  { id: 'p-blazer', name: "Navy Suit Blazer", brand: "NOVAWEAR", img: IMG.blazer, section: 'resale', category: 'jacket', material: 'wool', originalPrice: 240, price: 45, condition: 0.85, demand: 0.45, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: '40R', seller: 'NOVAWEAR Take-back', garment: "wool blazer", colourName: 'Navy', colourHex: '#26324f', style: 'Elegant' },
  { id: 'p-raw-jeans', name: "Raw Selvedge Jeans", brand: "Levi's", img: IMG.rawJeans, section: 'resale', category: 'denim', material: 'denim', originalPrice: 159, price: 35, condition: 0.8, demand: 0.65, age: 0.6, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — very good', size: '32/32', seller: '@ryan.ong', garment: "raw selvedge jeans", colourName: 'Raw indigo', colourHex: '#27324a', pattern: 'Raw denim', style: 'Vintage' },
  { id: 'p-straight', name: "Straight-leg Jeans", brand: "NOVAWEAR", img: IMG.straightJeans, section: 'resale', category: 'denim', material: 'denim', originalPrice: 99, price: 22, condition: 0.85, demand: 0.65, age: 0.4, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — like new', size: '28', seller: '@priya.k', garment: "straight-leg jeans", colourName: 'Mid-wash blue', colourHex: '#6f93bd', pattern: 'Mid wash', style: 'Casual' },
  { id: 'p-chinos', name: "Khaki Chinos", brand: "THREADLAB", img: IMG.chinos, section: 'resale', category: 'trousers', material: 'cotton', originalPrice: 79, price: 16, condition: 0.85, demand: 0.5, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: '32', seller: '@jun.lim', garment: "cotton chinos", colourName: 'Khaki', colourHex: '#a89572', style: 'Minimal' },
  { id: 'p-joggers', name: "Sunshine Jogger Set", brand: "URBAN/01", img: IMG.joggerSet, section: 'resale', category: 'trousers', material: 'cotton', originalPrice: 120, price: 24, condition: 0.8, demand: 0.6, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — good', size: 'S', seller: '@mei.tan', garment: "fleece jogger set", colourName: 'Marigold', colourHex: '#e7b21e', style: 'Streetwear' },
  { id: 'p-cutoffs', name: "Distressed Denim Cut-offs", brand: "Levi's", img: IMG.cutoffs, section: 'resale', category: 'denim', material: 'denim', originalPrice: 59, price: 12, condition: 0.7, demand: 0.65, age: 0.6, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — distressed', size: '26', seller: '@priya.k', kind: 'Skirts & shorts', garment: "denim cut-off shorts", colourName: 'Bleach wash', colourHex: '#b5c9dd', pattern: 'Distressed', style: 'Streetwear' },
  { id: 'p-skater', name: "Black Skater Skirt", brand: "THREADLAB", img: IMG.skaterSkirt, section: 'resale', category: 'skirt', material: 'polyester', originalPrice: 49, price: 11, condition: 0.85, demand: 0.55, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: 'S', seller: '@mei.tan', garment: "skater skirt", colourName: 'Black', colourHex: '#1d1d1f', style: 'Cute' },
  { id: 'p-floral-dress', name: "Red Floral Midi Dress", brand: "LOOPFORM", img: IMG.floralDress, section: 'resale', category: 'dress', material: 'polyester', originalPrice: 120, price: 28, condition: 0.85, demand: 0.6, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — excellent', size: 'M', seller: '@priya.k', garment: "floral midi dress", colourName: 'Poppy red', colourHex: '#c8302f', pattern: 'Floral print', style: 'Vintage' },
  { id: 'p-maxi', name: "Scarlet Maxi Dress", brand: "LOOPFORM", img: IMG.maxiDress, section: 'resale', category: 'dress', material: 'polyester', originalPrice: 180, price: 39, condition: 0.9, demand: 0.55, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — worn once', size: 'S', seller: '@mei.tan', garment: "maxi dress", colourName: 'Scarlet', colourHex: '#c42431', style: 'Elegant' },
  { id: 'p-wrap', name: "Sky Wrap Maxi Dress", brand: "NOVAWEAR", img: IMG.wrapDress, section: 'resale', category: 'dress', material: 'blend', originalPrice: 150, price: 32, condition: 0.85, demand: 0.55, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'M', seller: '@jun.lim', garment: "wrap maxi dress", colourName: 'Sky blue', colourHex: '#a6bfd6', style: 'Elegant' },
  { id: 'p-chambray-dress', name: "Chambray Shirt Dress", brand: "Levi's", img: IMG.chambrayDress, section: 'resale', category: 'dress', material: 'denim', originalPrice: 99, price: 24, condition: 0.85, demand: 0.6, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'S', seller: '@priya.k', garment: "chambray shirt dress", colourName: 'Light-wash blue', colourHex: '#8fb3d6', pattern: 'Light wash', style: 'Casual' },
  { id: 'p-tan-lowtop', name: "Tan Leather Low-tops", brand: "URBAN/01", img: IMG.tanSneaker, section: 'resale', category: 'sneaker', material: 'leather', originalPrice: 160, price: 48, condition: 0.85, demand: 0.7, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — worn twice', size: 'US 9', seller: '@hafiz.r', garment: "leather low-top sneakers", colourName: 'Tan', colourHex: '#b27a45', style: 'Streetwear' },
  { id: 'p-air-runner', name: "White & Orange Runner", brand: "Nike", img: IMG.airRunner, section: 'resale', category: 'sneaker', material: 'blend', originalPrice: 160, price: 44, condition: 0.85, demand: 0.75, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'US 8', seller: '@ryan.ong', garment: "running sneakers", colourName: 'White & orange', colourHex: '#eeeae4', style: 'Streetwear' },
  { id: 'p-court', name: "White Court Sneaker", brand: "Puma", img: IMG.courtSneaker, section: 'resale', category: 'sneaker', material: 'leather', originalPrice: 110, price: 29, condition: 0.85, demand: 0.6, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — very good', size: 'US 10', seller: '@jun.lim', garment: "leather court sneakers", colourName: 'White', colourHex: '#f1f0ec', style: 'Minimal' },
  { id: 'p-pastel', name: "Pastel Platform Sneaker", brand: "Nike", img: IMG.pastelSneaker, section: 'resale', category: 'sneaker', material: 'blend', originalPrice: 140, price: 38, condition: 0.85, demand: 0.65, age: 0.4, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — like new', size: 'US 7', seller: '@mei.tan', garment: "platform sneakers", colourName: 'Pastel mix', colourHex: '#d9c8e8', style: 'Y2K' },
  { id: 'p-skate', name: "Burgundy Skate Shoes", brand: "URBAN/01", img: IMG.skateShoes, section: 'resale', category: 'sneaker', material: 'blend', originalPrice: 75, price: 19, condition: 0.8, demand: 0.6, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — good', size: 'US 9', seller: '@hafiz.r', garment: "canvas skate shoes", colourName: 'Burgundy', colourHex: '#7a1f2b', style: 'Streetwear' },
  { id: 'p-floral-heels', name: "Floral Stiletto Heels", brand: "LOOPFORM", img: IMG.floralHeels, section: 'resale', category: 'sneaker', material: 'leather', originalPrice: 180, price: 36, condition: 0.9, demand: 0.5, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — worn once', size: 'EU 38', seller: '@priya.k', garment: "floral stiletto heels", colourName: 'Floral blue', colourHex: '#3a5ea8', pattern: 'Floral print', style: 'Elegant' },
  { id: 'p-navy-heels', name: "Navy Suede Pumps", brand: "LOOPFORM", img: IMG.navyHeels, section: 'resale', category: 'sneaker', material: 'leather', originalPrice: 150, price: 31, condition: 0.85, demand: 0.5, age: 0.5, rarity: 'Limited', life: 2, conditionLabel: 'Pre-owned — very good', size: 'EU 37', seller: '@mei.tan', garment: "suede pumps", colourName: 'Navy', colourHex: '#233459', style: 'Elegant' },
  { id: 'p-pink-bag', name: "Blush Chain Shoulder Bag", brand: "LOOPFORM", img: IMG.pinkBag, section: 'resale', category: 'bag', material: 'leather', originalPrice: 189, price: 44, condition: 0.9, demand: 0.65, age: 0.4, rarity: 'Rare', life: 2, conditionLabel: 'Pre-owned — excellent', seller: '@priya.k', garment: "leather shoulder bag", colourName: 'Blush pink', colourHex: '#e9b7c0', style: 'Elegant' },
  { id: 'p-wallet', name: "Brown Leather Wallet", brand: "THREADLAB", img: IMG.wallet, section: 'resale', category: 'bag', material: 'leather', originalPrice: 89, price: 18, condition: 0.8, demand: 0.55, age: 0.6, rarity: 'Common', life: 2, conditionLabel: 'Pre-owned — good', seller: '@ryan.ong', garment: "leather wallet", colourName: 'Chestnut', colourHex: '#6e3f22', style: 'Minimal' },

  { id: 'c-patch-jacket', name: 'Patchwork Chore Jacket', brand: 'Maya Studio', img: IMG.jeansRack, section: 'creator', category: 'jacket', material: 'denim', originalPrice: 89, price: 68, condition: 1, demand: 0.8, age: 0, rarity: 'Rare', life: 3, conditionLabel: 'One of one', seller: 'Maya Studio', fixed: { resale: 74 } },
  { id: 'c-sleeve', name: 'Uniform Laptop Sleeve 14"', brand: 'ReThread SG', img: IMG.greenTees, section: 'creator', category: 'shirt', material: 'cotton', originalPrice: 40, price: 32, condition: 1, demand: 0.75, age: 0, rarity: 'Limited', life: 2, conditionLabel: 'Handmade', seller: 'ReThread SG', fixed: { resale: 36 } },
  { id: 'c-print-tee', name: 'Hand-pulled Print Tee /50', brand: 'Kopi Print Co.', img: IMG.graphicTee, section: 'creator', category: 'shirt', material: 'cotton', originalPrice: 40, price: 28, condition: 1, demand: 0.8, age: 0, rarity: 'Limited', life: 2, conditionLabel: 'Numbered edition', seller: 'Kopi Print Co.', fixed: { resale: 34 } },
  { id: 'c-crop-hoodie', name: 'Chain-stitch Cropped Hoodie', brand: 'Studio Hollow', img: IMG.whiteSweat, section: 'creator', category: 'hoodie', material: 'cotton', originalPrice: 59, price: 45, condition: 1, demand: 0.7, age: 0, rarity: 'Rare', life: 2, conditionLabel: 'One of one', seller: 'Studio Hollow', fixed: { resale: 52 } },
  { id: 'c-denim-tote', name: 'Denim Panel Tote', brand: 'Maya Studio', img: IMG.jeansStack, section: 'creator', category: 'bag', material: 'denim', originalPrice: 69, price: 32, condition: 1, demand: 0.75, age: 0, rarity: 'Limited', life: 2, conditionLabel: 'Handmade', seller: 'Maya Studio', fixed: { resale: 36 } },
  { id: 'c-overshirt', name: 'Four-tee Patchwork Overshirt', brand: 'ReThread SG', img: IMG.oversizedTee, section: 'creator', category: 'shirt', material: 'cotton', originalPrice: 40, price: 39, condition: 1, demand: 0.7, age: 0, rarity: 'Rare', life: 2, conditionLabel: 'One of one', seller: 'ReThread SG', fixed: { resale: 44 } },

  { id: 'm-denim-offcuts', name: 'Denim Offcuts — 2 kg', brand: 'LOOPFORM', img: IMG.jeansStack, section: 'materials', category: 'denim', material: 'denim', originalPrice: 60, price: 8, condition: 0.6, demand: 0.6, age: 0.5, rarity: 'Common', life: 2, conditionLabel: 'Graded B', seller: 'LOOPFORM Materials' },
  { id: 'm-jersey', name: 'Cotton Jersey Blanks ×10', brand: 'NOVAWEAR', img: IMG.whiteTee, section: 'materials', category: 'shirt', material: 'cotton', originalPrice: 190, price: 22, condition: 0.9, demand: 0.7, age: 0.5, rarity: 'Common', life: 1, conditionLabel: 'Unprinted overstock', seller: 'NOVAWEAR' },
  { id: 'm-black-tees', name: 'Black Tee Seconds ×12', brand: 'URBAN/01', img: IMG.blackTee, section: 'materials', category: 'shirt', material: 'cotton', originalPrice: 300, price: 30, condition: 0.7, demand: 0.6, age: 0.4, rarity: 'Common', life: 1, conditionLabel: 'Print misalignment', seller: 'URBAN/01' },
  { id: 'm-knit', name: 'Knit Remnant Pack', brand: 'THREADLAB', img: IMG.knit, section: 'materials', category: 'knitwear', material: 'wool', originalPrice: 120, price: 14, condition: 0.7, demand: 0.5, age: 0.6, rarity: 'Limited', life: 2, conditionLabel: 'Sampling yarns', seller: 'THREADLAB' },
]
