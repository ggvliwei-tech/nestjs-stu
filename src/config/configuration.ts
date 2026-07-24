const getEnv = (key: string): string => {
    const val = process.env[key];
    if (!val) {
        throw new Error(`环境变量 ${key} 未在 .env 文件中配置，请检查！`);
    }
    return val;
};

export default () => ({
    APP_PORT: parseInt(process.env.APP_PORT || '3000', 10),
    DB_HOST: getEnv('DB_HOST'),
    DB_PORT: parseInt(getEnv('DB_PORT') || '3306', 10),
    DB_USER: getEnv('DB_USER'),
    DB_PWD: getEnv('DB_PWD'),
    DB_NAME: getEnv('DB_NAME'),

    // JWT
    JWT_SECRET: getEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
});
