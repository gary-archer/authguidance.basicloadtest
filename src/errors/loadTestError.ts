/*
 * A simple error entity for our load test
 */
export class LoadTestError extends Error {

    private _errorCode: string;
    private _details: any;

    /*
     * This simple error has a status, an error code, some technical details and a call stack
     */
    public constructor(errorCode: string, message: string) {

        // Initialise fields
        super(message);
        this._errorCode = errorCode;
        this._details = null;

        // Ensure that instanceof works
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public getErrorCode(): string {
        return this._errorCode;
    }

    public get details(): any {
        return this._details;
    }

    public set details(value: any) {
        this._details = value;
    }

    /*
     * Form a string representation
     */
    public toString(): string {

        const data: any = {
            message: this.message,
            errorCode: this._errorCode,
        };

        if (this._details) {
            data.details = this._details;
        }

        if (this.stack) {
            data.stack = this.getStackFrames();
        }

        return JSON.stringify(data, null, 2);
    }

    /*
     * Format stack frames in a readable manner
     */
    private getStackFrames(): string[] {

        const frames: string[] = [];
        if (this.stack) {
            const items = this.stack.split('\n').map((x: string) => x.trim()) as string[];
            items.forEach((i) => {
                frames.push(i);
            });
        }

        return frames;
    }
}
