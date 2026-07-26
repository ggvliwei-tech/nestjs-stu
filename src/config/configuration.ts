// 环境变量读取辅助函数：读取指定 key 的值，如果不存在则抛出错误
const getEnv = (key: string): string => {
  const val = process.env[key]; // 从 process.env 中获取环境变量
  if (!val) {
    // 如果变量不存在，抛出错误提示需要检查 .env 配置
    throw new Error(`环境变量 ${key} 未在 .env 文件中配置，请检查！`);
  }
  return val; // 返回环境变量值
};

// 导出配置函数，NestJS ConfigModule 会调用此函数加载配置
export default () => ({
  // 应用端口号，默认 3000，转换为数字类型
  APP_PORT: parseInt(process.env.APP_PORT || '3000', 10),
  // 数据库主机地址（必填）
  DB_HOST: getEnv('DB_HOST'),
  // 数据库端口号，默认 3306，转换为数字类型
  DB_PORT: parseInt(getEnv('DB_PORT') || '3306', 10),
  // 数据库用户名（必填）
  DB_USER: getEnv('DB_USER'),
  // 数据库密码（必填）
  DB_PWD: getEnv('DB_PWD'),
  // 数据库名称（必填）
  DB_NAME: getEnv('DB_NAME'),

  // JWT 相关配置
  // JWT 签名密钥（必填），用于 Token 的加密和解密
  // JWT 双Token
  JWT_ACCESS_SECRET: getEnv('JWT_ACCESS_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});

