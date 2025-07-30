export class TopBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.isAdmin = this.getAttribute('is-admin') === 'true';
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--brand-color, #e16316);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .left {
                    display:flex;
                    align-items:center;
                    gap:0.5rem;
                }
                .title {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .controls {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                .menu { position:relative; }
                .menu-items {
                    display:none;
                    position:absolute;
                    right:0;
                    margin-top:0.5rem;
                    background:#1f2937;
                    border-radius:0.25rem;
                    box-shadow:0 2px 6px rgba(0,0,0,0.4);
                }
                .menu-items button {
                    display:block;
                    width:100%;
                    padding:0.5rem 1rem;
                    background:transparent;
                    border:none;
                    text-align:left;
                }
                .menu-items button:hover { background:#374151; }
                button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.25rem;
                    background: rgba(255,255,255,0.2);
                    color: white;
                    cursor: pointer;
                }
                button:hover {
                    background: rgba(255,255,255,0.3);
                }
            </style>
            <div class="container">
                <div class="left">
                    <a id="back" href="index.html" style="text-decoration:none;color:white">&larr; Back</a>
                    <div class="title">Event Control</div>
                </div>
                <div class="controls">
                    <div class="menu">
                        <button id="account-btn">Account ▾</button>
                        <div class="menu-items" id="account-menu">
                            <button id="edit-account">Edit Account</button>
                            <button id="brand-settings">Brand Settings</button>
                            ${this.isAdmin ? '<button id="admin-panel">Admin Panel</button>' : ''}
                            <button id="logout">Logout</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const menuBtn = this.shadowRoot.getElementById('account-btn');
        const menu = this.shadowRoot.getElementById('account-menu');
        menuBtn.onclick = () => {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        };
        this.shadowRoot.getElementById('edit-account').onclick = () =>
            this.dispatchEvent(new CustomEvent('edit-account'));
        this.shadowRoot.getElementById('brand-settings').onclick = () =>
            this.dispatchEvent(new CustomEvent('brand-settings'));
        if (this.isAdmin) {
            const adm = this.shadowRoot.getElementById('admin-panel');
            if (adm) adm.onclick = () =>
                this.dispatchEvent(new CustomEvent('admin-panel'));
        }
        this.shadowRoot.getElementById('logout').onclick = () =>
            this.dispatchEvent(new CustomEvent('logout'));
    }
}

customElements.define('top-bar', TopBar);