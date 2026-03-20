import { Product } from "../../data/productDatabase";

export interface ShoppingItem {
  product: Product;
  quantity: number;
  checked: boolean;
}
