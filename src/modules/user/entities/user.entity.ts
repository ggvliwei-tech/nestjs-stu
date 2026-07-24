import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_user')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50, comment: '用户名' })
    username: string;

    @Column({ length: 100, comment: '密码' })
    password: string;

    @Column({ default: 1, comment: '状态 1正常 0禁用' })
    status: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createTime: Date;
}
