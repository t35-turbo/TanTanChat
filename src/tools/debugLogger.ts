export function debugLogger(
    message: any,
    ...args: any[]
): void;
export function debugLogger(
    environments: string | string[],
    message: any,
    ...args: any[]
): void;
export function debugLogger(
    environmentsOrMessage: string | string[] | any,
    messageOrArg?: any,
    ...restArgs: any[]
): void {
    let environments: string[];
    let message: any;
    let args: any[];

    if (Array.isArray(environmentsOrMessage)) {
        // First param is array of environments
        environments = environmentsOrMessage;
        message = messageOrArg;
        args = restArgs;
    } else if (typeof environmentsOrMessage === 'string' && messageOrArg !== undefined) {
        // First param is single environment string
        environments = [environmentsOrMessage];
        message = messageOrArg;
        args = restArgs;
    } else {
        // First param is the message (default to 'development')
        environments = ['development'];
        message = environmentsOrMessage;
        args = messageOrArg !== undefined ? [messageOrArg, ...restArgs] : restArgs;
    }

    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (environments.includes(nodeEnv)) {
        console.log(message, ...args);
    }
}

// Development logging wrapper
export const devLog = (message: any, ...args: any[]) => debugLogger("development", message, ...args);