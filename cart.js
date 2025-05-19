// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function addToCart(product) {
    event.preventDefault(); // Prevent default link behavior
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    alert('Product added to cart!');
}

function removeFromCart(productId) {
    event.preventDefault(); // Prevent default link behavior
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = parseInt(quantity);
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        }
    }
}

function updateCartDisplay() {
    const cartTable = document.querySelector('#cart table tbody');
    if (!cartTable) return;

    cartTable.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="#" onclick="removeFromCart('${item.id}')"><i class="fas fa-times-circle"></i></a></td>
            <td><img src="${item.image}" alt="${item.name}"></td>
            <td>${item.name}</td>
            <td>₱ ${item.price.toFixed(2)}</td>
            <td><input type="number" value="${item.quantity}" min="1" onchange="updateQuantity('${item.id}', this.value)"></td>
            <td>₱ ${subtotal.toFixed(2)}</td>
        `;
        cartTable.appendChild(row);
    });

    // Update totals
    const subtotalElement = document.getElementById('cart-subtotal');
    const totalElement = document.getElementById('cart-total');
    if (subtotalElement && totalElement) {
        subtotalElement.textContent = `₱ ${total.toFixed(2)}`;
        totalElement.textContent = `₱ ${total.toFixed(2)}`;
    }
}

// Initialize cart display when page loads
document.addEventListener('DOMContentLoaded', updateCartDisplay);

async function saveOrder() {
    if (!isAuthenticated()) {
        alert('Please sign in to complete your order');
        window.location.href = 'index.html';
        return;
    }

    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    if (cartItems.length === 0) {
        alert('Your cart is empty');
        return;
    }

    const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    try {
        const response = await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                items: cartItems,
                totalAmount
            })
        });

        if (response.ok) {
            // Clear cart after successful order
            localStorage.removeItem('cart');
            alert('Order placed successfully!');
            window.location.href = 'homepage.html';
        } else {
            throw new Error('Failed to place order');
        }
    } catch (error) {
        console.error('Error saving order:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Add event listener to checkout button
document.querySelector('#cart-add button').addEventListener('click', saveOrder); 