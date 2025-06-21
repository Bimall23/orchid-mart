(function() {
  var core = ng.core;
  var browser = ng.platformBrowser;
  var platformBrowserDynamic = ng.platformBrowserDynamic.platformBrowserDynamic;
  var forms = ng.forms;

  var products = [
    { id: 1, name: 'Milk', price: 3.5, category: 'Dairy', stock: 10 },
    { id: 2, name: 'Bread', price: 2.0, category: 'Bakery', stock: 20 },
    { id: 3, name: 'Soap', price: 1.5, category: 'Household', stock: 30 },
    { id: 4, name: 'Rice', price: 5.0, category: 'Pantry', stock: 15 },
  ];

  var categories = Array.from(new Set(products.map(function(p){ return p.category; })));

  var SHIPPING_FEE = 5;

  var AppComponent = core.Component({
    selector: 'orchid-app',
    template: `
<header>
  <h1>Orchid Local Mart</h1>
  <input type="text" placeholder="Search products" [(ngModel)]="searchTerm">
  <select [(ngModel)]="category">
    <option value="">All Categories</option>
    <option *ngFor="let cat of categories" [value]="cat">{{cat}}</option>
  </select>
  <button (click)="toggleOrders()">{{showOrders ? 'Back to Shop' : 'View Orders'}}</button>
</header>
<main *ngIf="!showOrders">
  <section class="products">
    <div class="product" *ngFor="let product of filteredProducts()">
      <h3>{{product.name}}</h3>
      <p>\${{product.price.toFixed(2)}} ({{product.stock}} in stock)</p>
      <button (click)="addToCart(product)" [disabled]="!product.stock">Add to Cart</button>
    </div>
  </section>
  <aside class="cart">
    <h2>Your Cart</h2>
    <ul>
      <li *ngFor="let item of cart">
        {{item.name}}
        <button (click)="changeQty(item,-1)" [disabled]="item.qty===1">-</button>
        {{item.qty}}
        <button (click)="changeQty(item,1)" [disabled]="item.qty>=stockRemaining(item)">+</button>
        <button (click)="removeFromCart(item)">x</button>
        - \${{(item.price * item.qty).toFixed(2)}}
      </li>
    </ul>
    <label><input type="checkbox" [(ngModel)]="subscribed"> Subscription (free shipping)</label>
    <p>Subtotal: \${{subtotal().toFixed(2)}}</p>
    <p *ngIf="loyaltyDiscount()">Loyalty Discount: -\${{loyaltyDiscount().toFixed(2)}}</p>
    <p>Shipping: \${{shipping().toFixed(2)}} </p>
    <p>Total: \${{total().toFixed(2)}} </p>
    <button (click)="showModal = true" [disabled]="!cart.length">Checkout</button>
  </aside>
</main>
<section class="orders" *ngIf="showOrders">
  <h2>Your Orders</h2>
  <div class="order" *ngFor="let order of orders">
    <p>Order #{{order.id}} - {{order.status}}</p>
    <ul>
      <li *ngFor="let item of order.items">{{item.name}} x{{item.qty}}</li>
    </ul>
    <p>Total: \${{order.total.toFixed(2)}}</p>
    <button *ngIf="order.status==='Processing'" (click)="progressOrder(order)">Mark Shipped</button>
    <button *ngIf="order.status==='Shipped'" (click)="progressOrder(order)">Mark Delivered</button>
    <button *ngIf="order.status==='Delivered'" (click)="requestReturn(order)">Request Return</button>
    <span *ngIf="order.status==='Return Requested'">Return Requested</span>
  </div>
</section>
<div class="modal" [class.hidden]="!showModal">
  <div class="modal-content">
    <h2>Checkout</h2>
    <label><input type="radio" name="payment" value="credit" [(ngModel)]="payment" checked> Credit/Debit Card</label>
    <label><input type="radio" name="payment" value="wallet" [(ngModel)]="payment"> Digital Wallet</label>
    <label><input type="radio" name="payment" value="cod" [(ngModel)]="payment"> Cash on Delivery</label>
    <button (click)="confirm()">Confirm</button>
    <button (click)="showModal = false">Close</button>
  </div>
</div>
    `
  }).Class({
    constructor: function() {
      this.searchTerm = '';
      this.category = '';
      this.cart = [];
      this.showModal = false;
      this.payment = 'credit';
      this.categories = categories;
      this.products = products;
      this.orders = [];
      this.subscribed = false;
      this.showOrders = false;
    },
    filteredProducts: function() {
      var term = this.searchTerm.toLowerCase();
      var cat = this.category;
      return this.products.filter(function(p) {
        var match = p.name.toLowerCase().indexOf(term) !== -1;
        var catMatch = !cat || p.category === cat;
        return match && catMatch;
      });
    },
    addToCart: function(product) {
      if (!product.stock) return;
      var item = this.cart.find(function(i){ return i.id === product.id; });
      if(item) {
        if(item.qty < product.stock) item.qty += 1;
      } else {
        this.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
      }
    },
    changeQty: function(item, delta) {
      var prod = this.products.find(function(p){ return p.id === item.id; });
      if(!prod) return;
      item.qty += delta;
      if(item.qty <= 0) {
        this.removeFromCart(item);
      } else if(item.qty > prod.stock) {
        item.qty = prod.stock;
      }
    },
    removeFromCart: function(item) {
      var idx = this.cart.indexOf(item);
      if(idx >= 0) this.cart.splice(idx,1);
    },
    stockRemaining: function(item) {
      var prod = this.products.find(function(p){ return p.id === item.id; });
      return prod ? prod.stock : 0;
    },
    subtotal: function() {
      return this.cart.reduce(function(sum, item){ return sum + item.price * item.qty; }, 0);
    },
    loyaltyDiscount: function() {
      var sub = this.subtotal();
      return sub >= 1000 ? sub * 0.1 : 0;
    },
    shipping: function() {
      return this.subscribed ? 0 : SHIPPING_FEE;
    },
    total: function() {
      return this.subtotal() - this.loyaltyDiscount() + this.shipping();
    },
    confirm: function() {
      var order = {
        id: this.orders.length + 1,
        items: this.cart.map(function(i){ return {id:i.id,name:i.name,qty:i.qty,price:i.price}; }),
        total: this.total(),
        status: 'Processing'
      };
      var self = this;
      this.cart.forEach(function(item){
        var p = self.products.find(function(pr){ return pr.id === item.id; });
        if(p) p.stock -= item.qty;
      });
      this.orders.push(order);
      this.cart = [];
      this.showModal = false;
      alert('Thank you for your purchase!');
    },
    progressOrder: function(order) {
      if(order.status === 'Processing') order.status = 'Shipped';
      else if(order.status === 'Shipped') order.status = 'Delivered';
    },
    requestReturn: function(order) {
      if(order.status === 'Delivered') order.status = 'Return Requested';
    },
    toggleOrders: function() {
      this.showOrders = !this.showOrders;
    }
  });

  var AppModule = core.NgModule({
    imports: [browser.BrowserModule, forms.FormsModule],
    declarations: [AppComponent],
    bootstrap: [AppComponent]
  }).Class({ constructor: function() {} });

  platformBrowserDynamic().bootstrapModule(AppModule);
})();
