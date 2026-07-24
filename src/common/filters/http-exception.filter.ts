import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.getStatus();
        const errMsg = exception.getResponse();

        response.status(HttpStatus.OK).json({
            code: status,
            msg: typeof errMsg === 'string' ? errMsg : (errMsg as any).message,
            data: null,
        });
    }
}
