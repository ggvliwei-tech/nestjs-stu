-- =============================================
-- NestJS11 项目初始化数据库脚本 MySQL 8.0+
-- 数据库：nest_db
-- 数据表：sys_user 系统用户表
-- =============================================

-- 1. 创建数据库，不存在则新建，字符集utf8mb4完整支持emoji
CREATE DATABASE IF NOT EXISTS `nest_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用该数据库
USE `nest_db`;

-- 2. 删除旧表（避免重复执行报错）
DROP TABLE IF EXISTS `sys_user`;

-- 3. 创建用户表 完全对应 TypeORM User实体
CREATE TABLE `sys_user` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键ID',
  `username` VARCHAR(50) NOT NULL COMMENT '登录用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '加密后密码',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态：1正常 0禁用',
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_sys_user_username` (`username`) COMMENT '用户名唯一约束'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 4. 初始化一条管理员测试数据（密码：123456 bcrypt加密字符串）
INSERT INTO `sys_user` (`username`, `password`, `status`)
VALUES ('admin', '$2b$10$vI8aWBqBg5nTRcXeaMlyLu/E0c2p61c/jAF7oypnE7j4Vbtc9Qv2', 1);

-- 5. 可选：TypeORM迁移记录表（自动生成，提前建好防止迁移命令报错）
DROP TABLE IF EXISTS `typeorm_migrations`;
CREATE TABLE `typeorm_migrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `timestamp` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='TypeORM迁移版本记录表';


USE nest_db;
-- 给account_book增加所属用户ID，关联sys_user.id
ALTER TABLE `account_book` ADD COLUMN `user_id` INT UNSIGNED NOT NULL COMMENT '创建人用户ID';

-- 外键约束（可选，保证数据完整性，不需要可删掉）
ALTER TABLE `account_book`
ADD CONSTRAINT `fk_account_book_user`
FOREIGN KEY (`user_id`) REFERENCES `sys_user`(`id`)
ON DELETE CASCADE; -- 用户删除，账本级联删除
