A tool to find differences in table-like data

```ts
// The data interface
interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
}

// Define the schema that is used for comparison
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

// Add the new state
dr.addSourceRow({id: '1000', name: 'Product 1', price: 10.00, stock: 10});
dr.addSourceRow({id: '2000', name: 'Product 2', price: 999.00, stock: 100});
dr.addSourceRow({id: '3000', name: 'Product 3', price: 150.00, stock: 1});

// Add the current state
dr.addDestinationRow({id: '1000', name: 'Product 1', price: 10.00, stock: 10});
dr.addDestinationRow({id: '2000', name: 'Product 2', price: 999.00, stock: 101});
dr.addDestinationRow({id: '4000', name: 'Product 3', price: 150.00, stock: 1});

// Output the differences
for(const entry of dr.receiveAll(Type.Missing, Type.New, Type.Changed)) {
    console.log(`${entry}`);
}

// Missing "id": "4000", "name": "Product 3", "price": 150, "stock": 1
// New "id": "3000", "name": "Product 3", "price": 150, "stock": 1
// Changed ["id": "2000"] to ["stock": 101 => 100]
```