import { Controller } from './controller';
import { I18n } from './i18n';
import { DBX_APIKEY_FULL } from './config';

// Extend Number prototype with clamp method
declare global {
    interface Number {
        clamp(min: number, max: number): number;
    }
}

Number.prototype.clamp = function(min: number, max: number): number {
    return this < min ? min : this > max ? max : this;
};

console.log("now starting zupfnoter");
console.log("zupfnoter is now running");

class Application {
    private uiController: Controller;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                this.uiController = new Controller();
                
                // Add Dropbox SDK
                const dropboxScript = document.createElement('script');
                dropboxScript.type = 'text/javascript';
                dropboxScript.src = `https://www.dropbox.com/static/api/2/dropins.js`;
                dropboxScript.id = 'dropboxjs';
                dropboxScript.setAttribute('data-app-key', DBX_APIKEY_FULL);
                document.querySelector('html')?.appendChild(dropboxScript);

                // Expose controller for debugging
                (window as any).zupfnoter = this.uiController;
            } catch (error) {
                const err = error as Error;
                alert(`${I18n.t("BUG: error while initializing Zupfnoter Controller")}\n${err.stack}`);
                console.error("BUG: error loading Zupfnoter\n", err.stack);
            }
        });
    }
}

export const app = new Application();