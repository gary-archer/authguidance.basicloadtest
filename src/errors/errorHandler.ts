import {LoadTestError} from './loadTestError';

/*
 * A basic error translation class
 */
export class ErrorHandler {

    /*
     * Collect error data from an API response
     */
    public static fromHttpResponse(errorCode: any, error: any): LoadTestError {

        // Create a typed error
        const responseBody = (error.response && error.response.data) ? error.response.data : null;
        const loadTestError = new LoadTestError(errorCode, 'Problem encountered during an HTTP request');

        // Populate details
        if (responseBody) {
            loadTestError.details = responseBody;
        } else if (error.message) {
            loadTestError.details = error.message;
        }
        if (error.stack) {
            loadTestError.stack = error.stack;
        }

        return loadTestError;
    }

    /*
     * Collect error data from an exception in the client side code
     */
    public static fromException(exception: any): LoadTestError {

        // Already handled
        if (exception instanceof LoadTestError) {
            return exception;
        }

        // Create a typed error
        const loadTestError = new LoadTestError('load_test_exception', 'Problem encountered in the load test');

        // Populate details
        if (exception.message) {
            loadTestError.details = exception.message;
        }
        if (exception.stack) {
            loadTestError.stack = exception.stack;
        }

        return loadTestError;
    }
}
