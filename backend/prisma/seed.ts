import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Admin User (Backend Admin)
  const password = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created Admin User:', admin.username);

  // 2. Create Players
  const playersData = [
    { openid: 'user_001', name: '张三', points: 1200, role: 'USER', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { openid: 'user_002', name: '李四', points: 950, role: 'USER', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { openid: 'user_003', name: '王五', points: 1500, role: 'ADMIN', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack' }, // Admin Player
    { openid: 'user_004', name: '赵六', points: 800, role: 'USER', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly' },
    { openid: 'user_005', name: '孙七', points: 1100, role: 'USER', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo' },
  ];

  const players = [];
  for (const p of playersData) {
    const player = await prisma.player.upsert({
      where: { openid: p.openid },
      update: {},
      create: p,
    });
    players.push(player);
  }
  console.log(`Created ${players.length} players`);

  // 3. Create Tournaments
  const tournamentData = [
    {
      name: '2025 春季网球公开赛',
      location: '上海仙霞网球中心',
      startTime: new Date('2025-03-15T09:00:00Z'),
      registrationStart: new Date('2025-02-01T00:00:00Z'),
      registrationEnd: new Date('2025-03-01T00:00:00Z'),
      status: 'PENDING', // 报名中
      description: '面向全社会的业余网球赛事，欢迎各路高手切磋。',
      rules: '采用单淘汰制，三盘两胜，平局抢七。',
    },
    {
      name: '2024 冬季年终总决赛',
      location: '北京国家网球中心',
      startTime: new Date('2024-12-25T10:00:00Z'),
      status: 'COMPLETED', // 已结束
      description: '年度积分前8名受邀参加。',
    },
    {
      name: '2025 社区友谊赛',
      location: '朝阳公园网球场',
      startTime: new Date('2025-05-01T14:00:00Z'),
      status: 'PENDING',
    }
  ];

  const tournaments = [];
  for (const t of tournamentData) {
    const tournament = await prisma.tournament.create({
      data: t,
    });
    tournaments.push(tournament);
  }
  console.log(`Created ${tournaments.length} tournaments`);

  // 4. Create Applications (for the first tournament)
  const targetTournament = tournaments[0];
  const appsData = [
    { playerId: players[0].id, realName: '张三', phone: '13800138001', idCard: '310101199001011234', status: 'APPROVED' },
    { playerId: players[1].id, realName: '李四', phone: '13900139002', idCard: '310101199202022345', status: 'APPROVED' },
    { playerId: players[3].id, realName: '赵六', phone: '13700137004', idCard: '310101199505055678', status: 'PENDING' },
    { playerId: players[4].id, realName: '孙七', phone: '13600136005', idCard: '310101198808088901', status: 'APPROVED' },
  ];

  for (const app of appsData) {
    await prisma.playerApplication.create({
      data: {
        playerId: app.playerId,
        tournamentId: targetTournament.id,
        realName: app.realName,
        phone: app.phone,
        idCard: app.idCard,
        status: app.status,
      },
    });
  }
  console.log('Created applications for tournament 1');

  // 5. Create Results (for the completed tournament)
  const completedTournament = tournaments[1];
  // Assuming top 3 players participated
  const resultsData = [
    { playerId: players[2].id, rank: 1, pointsChange: 500 }, // 王五 (Admin) - Champion
    { playerId: players[0].id, rank: 2, pointsChange: 300 }, // 张三 - Runner up
    { playerId: players[4].id, rank: 3, pointsChange: 150 }, // 孙七 - 3rd
  ];

  for (const res of resultsData) {
    await prisma.tournamentResult.create({
      data: {
        tournamentId: completedTournament.id,
        playerId: res.playerId,
        rank: res.rank,
        pointsChange: res.pointsChange,
      },
    });
  }
  console.log('Created results for tournament 2');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
