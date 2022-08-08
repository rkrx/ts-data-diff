import { DiffRows, Type } from "./diff-rows.ts";
import { printf, sprintf } from "https://deno.land/std@0.95.0/fmt/printf.ts";
import { assertEquals } from "https://deno.land/std@0.151.0/testing/asserts.ts";

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
}

Deno.test("test diff", () => {
    const dr = new DiffRows<Product>(
        (product: Product) => ({id: product.id}),
        (product: Product) => {
            return {
                name: `${product.name}`,
                price: sprintf('%.2f', product.price),
                stock: sprintf('%d', product.stock)
            }
        }
    );
    
    dr.addSourceRow({id: '1000', name: 'Product 1', price: 10.00, stock: 10});
    dr.addSourceRow({id: '2000', name: 'Product 2', price: 999.00, stock: 100});
    dr.addSourceRow({id: '3000', name: 'Product 3', price: 150.00, stock: 1});
    
    dr.addDestinationRow({id: '1000', name: 'Product 1', price: 10.00, stock: 10});
    dr.addDestinationRow({id: '2000', name: 'Product 2', price: 999.00, stock: 101});
    dr.addDestinationRow({id: '4000', name: 'Product 3', price: 150.00, stock: 1});
    
    const rows = [...dr.receiveAll(Type.Missing, Type.New, Type.Changed)];

    assertEquals(rows[0].entry.id, '4000');
    assertEquals(rows[0].type, 'missing');

    assertEquals(rows[1].entry.id, '3000');
    assertEquals(rows[1].type, 'new');

    assertEquals(rows[2].entry.id, '2000');
    assertEquals(rows[2].type, 'changed');
    assertEquals(rows[2].entry.stock, 100);
});
