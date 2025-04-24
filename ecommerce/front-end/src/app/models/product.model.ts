export interface Product {
    id?: number;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    stock_quantity: number;
    created_at?: Date;
}