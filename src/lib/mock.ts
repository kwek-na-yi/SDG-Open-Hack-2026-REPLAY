/** Drawable product shapes, shared by the idea engine and the SVG renderer in components/product/ProductMock. */
import type { Material } from './engine'

export type Shape =
  | 'tote' | 'shoulder' | 'pouch' | 'sling' | 'sleeve' | 'bucketbag' | 'crossbody' | 'drawstring'
  | 'miniskirt' | 'midiskirt' | 'croptop' | 'corset' | 'vest' | 'jacket' | 'dress' | 'shorts'
  | 'buckethat' | 'scrunchie' | 'headband' | 'keychain' | 'wallet' | 'lanyard' | 'bandana'
  | 'cushion' | 'apron' | 'coasters' | 'planter' | 'shadowbox' | 'repaint'
  | 'tee' | 'hoodie' | 'jeans' | 'sneaker'

export interface MockSpec {
  shape: Shape
  material: Material
  colour: string
  patch?: boolean
}
