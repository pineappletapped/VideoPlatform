export class TopBar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--brand-color, #00ADF1);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .title {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .controls {
                    display: flex;
                    gap: 1rem;
                }
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
                <div class="title">Event Control</div>
                <div class="controls">
                    <button id="settings">Settings</button>
                    <button id="profile">Profile</button>
                    <button id="help">Help</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.shadowRoot.getElementById('settings').onclick = () => 
            this.dispatchEvent(new CustomEvent('settings-click'));
        
        this.shadowRoot.getElementById('profile').onclick = () =>
            this.dispatchEvent(new CustomEvent('profile-click'));
        
        this.shadowRoot.getElementById('help').onclick = () =>
            this.dispatchEvent(new CustomEvent('help-click'));
    }
}

customElements.define('top-bar', TopBar);