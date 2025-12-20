<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <view class="header-content">
        <TennisBall :size="24" />
        <text class="title">选手排行榜</text>
      </view>
    </view>
    
    <!-- Podium for Top 3 (领奖台) -->
    <view class="podium-container" v-if="players.length > 0">
      <!-- 2nd Place (Left) -->
      <view class="podium-item second" v-if="players[1]">
        <view class="medal-icon">🥈</view>
        <view class="avatar-wrapper">
          <image class="avatar-img" v-if="players[1].avatar" :src="players[1].avatar" mode="aspectFill"></image>
          <view class="avatar" v-else>{{ getAvatarText(players[1]) }}</view>
          <view class="badge silver">2</view>
        </view>
        <text class="name">{{ players[1].name || '未知' }}</text>
        <text class="points">{{ players[1].points }}</text>
      </view>
      <view class="podium-item placeholder" v-else></view>
      
      <!-- 1st Place (Center) -->
      <view class="podium-item first" v-if="players[0]">
        <view class="crown-icon">👑</view>
        <view class="avatar-wrapper">
          <image class="avatar-img" v-if="players[0].avatar" :src="players[0].avatar" mode="aspectFill"></image>
          <view class="avatar" v-else>{{ getAvatarText(players[0]) }}</view>
          <view class="badge gold">1</view>
        </view>
        <text class="name">{{ players[0].name || '未知' }}</text>
        <text class="points">{{ players[0].points }}</text>
      </view>
      
      <!-- 3rd Place (Right) -->
      <view class="podium-item third" v-if="players[2]">
        <view class="avatar-wrapper">
          <view class="avatar">{{ getAvatarText(players[2]) }}</view>
          <view class="badge bronze">3</view>
        </view>
        <text class="name">{{ players[2].name || '未知' }}</text>
        <text class="points">{{ players[2].points }}</text>
      </view>
      <view class="podium-item placeholder" v-else></view>
    </view>

    <!-- List for the rest (4th onwards) -->
    <view class="rank-list" v-if="restPlayers.length > 0">
      <view class="rank-header">
        <text class="col rank">排名</text>
        <text class="col name">选手</text>
        <text class="col points">积分</text>
      </view>
      
      <view v-for="(player, index) in restPlayers" :key="player.id" class="rank-item">
        <view class="col rank">
          <text>{{ index + 4 }}</text>
        </view>
        <text class="col name">{{ player.name || '未知' }}</text>
        <text class="col points">{{ player.points }}</text>
      </view>
    </view>
    
    <view v-if="players.length === 0" class="empty-tip">
      <text>暂无排名数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getRankings } from '../../api';
import TennisBall from '../../components/TennisBall.vue';

const players = ref<any[]>([]);

const restPlayers = computed(() => {
  return players.value.slice(3);
});

const getAvatarText = (player: any) => {
  // 获取头像占位文字（取名字第一个字）
  if (player && player.name) {
    return player.name[0];
  }
  return '?';
};

const fetchRankings = async () => {
  /**
   * 获取排行榜数据
   * 调用 API 获取积分排名
   */
  try {
    const res = await getRankings();
    players.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  fetchRankings();
});
</script>

<style>
.container { padding: 0; background-color: #f5f5f5; min-height: 100vh; }
.header { 
  margin-bottom: 20px; 
  padding: 20px 20px 30px; /* 底部留空间给领奖台 */
  border-bottom-left-radius: 30px; 
  border-bottom-right-radius: 30px; 
  box-shadow: 0 4px 10px rgba(58, 95, 11, 0.3);
  color: white;
}
.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.title { font-size: 24px; font-weight: bold; display: block; text-align: center; color: white; margin-bottom: 0; }

/* Podium Styles */
.podium-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  margin-top: -40px; /* 向上重叠到 Header */
  margin-bottom: 30px;
  padding: 0 20px;
  height: 220px;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 30%;
  position: relative;
  transition: all 0.3s ease;
}

.podium-item.placeholder {
  visibility: hidden;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.avatar {
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #555;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.badge {
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: white;
  font-weight: bold;
  border: 2px solid white;
}

.badge.gold { background-color: #FFD700; }
.badge.silver { background-color: #C0C0C0; }
.badge.bronze { background-color: #CD7F32; }

/* First Place Special Styling */
.podium-item.first {
  width: 36%; /* Slightly wider */
  z-index: 2;
  padding-bottom: 20px; /* Elevate visually if we had a podium base, here just positioning */
}
.podium-item.first .avatar, .podium-item.first .avatar-img {
  width: 80px;
  height: 80px;
  font-size: 28px;
  border: 4px solid #FFD700;
  border-radius: 50%;
}
.crown-icon {
  font-size: 32px;
  position: absolute;
  top: -45px;
  animation: float-small 2s ease-in-out infinite; /* Reduced float distance */
}
.medal-icon {
  font-size: 32px;
  position: absolute;
  top: -45px;
  animation: float 2s ease-in-out infinite;
}
.podium-item.second .medal-icon {
  animation-delay: 0.5s;
}
/* Third Place Animation */
.podium-item.third .medal-icon {
  animation: float 2s ease-in-out infinite; /* Ensure animation is applied */
  animation-delay: 1s;
}

/* Second Place */
.podium-item.second {
  order: -1; /* Ensure it appears to the left */
  padding-bottom: 0;
}
.podium-item.second .avatar, .podium-item.second .avatar-img {
  width: 60px;
  height: 60px;
  font-size: 20px;
  border: 3px solid #C0C0C0;
  border-radius: 50%;
}

/* Third Place */
.podium-item.third {
  padding-bottom: 0;
}
.podium-item.third .avatar, .podium-item.third .avatar-img {
  width: 60px;
  height: 60px;
  font-size: 20px;
  border: 3px solid #CD7F32;
  border-radius: 50%;
}

.podium-item .name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.podium-item .points {
  font-size: 12px;
  color: #2e7d32;
  font-weight: bold;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}

@keyframes float-small {
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); } /* Reduced to 5px */
  100% { transform: translateY(0); }
}

/* List Styles */
.rank-list { margin-top: 10px; border-top: 1px solid #f0f0f0; }
.rank-header { display: flex; font-weight: bold; border-bottom: 1px solid #eee; padding: 10px 0; color: #666; font-size: 14px; }
.rank-item { display: flex; padding: 15px 0; border-bottom: 1px solid #f5f5f5; align-items: center; }
.col { flex: 1; }
.col.rank { flex: 0 0 50px; font-weight: bold; color: #999; display: flex; align-items: center; justify-content: center; }
.col.points { text-align: right; font-weight: bold; color: #2e7d32; }
.empty-tip { text-align: center; color: #999; margin-top: 50px; }
</style>
