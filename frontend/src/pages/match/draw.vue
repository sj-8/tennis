<template>
  <view class="container">
    <view class="tabs">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">参赛选手</view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">对战签表</view>
    </view>

    <!-- 参赛选手 Tab -->
    <view v-if="currentTab === 0">
      <view class="header">
        <text class="title">参赛选手名单</text>
        <button class="btn-register-mini" @click="goToRegister" v-if="!isRegistered">报名</button>
      </view>

      <view v-if="participants.length === 0" class="empty-tip">
        <text>暂无报名人员</text>
      </view>

      <view class="list-section" v-if="mainDraw.length > 0">
        <view class="section-title">正赛名单 ({{ mainDraw.length }})</view>
        <view class="participant-list">
          <view v-for="(p, index) in mainDraw" :key="p.id" class="participant-item">
            <text class="index">{{ index + 1 }}</text>
            <image v-if="p.avatarUrl" :src="p.avatarUrl" class="avatar" mode="aspectFill"></image>
            <view v-else class="avatar-placeholder">{{ (p.nickname || p.name || 'U')[0] }}</view>
            <view class="name-container">
              <text class="gender-icon" :class="{ 'male': p.gender === '男', 'female': p.gender === '女' }" v-if="p.gender">
                {{ p.gender === '男' ? '♂' : (p.gender === '女' ? '♀' : '') }}
              </text>
              <text class="name">{{ p.nickname || p.name }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="list-section" v-if="waitList.length > 0">
        <view class="section-title">候补名单 ({{ waitList.length }})</view>
        <view class="participant-list waitlist">
          <view v-for="(p, index) in waitList" :key="p.id" class="participant-item">
            <text class="index">{{ index + 1 }}</text>
            <image v-if="p.avatarUrl" :src="p.avatarUrl" class="avatar" mode="aspectFill"></image>
            <view v-else class="avatar-placeholder">{{ (p.nickname || p.name || 'U')[0] }}</view>
            <view class="name-container">
              <text class="gender-icon" :class="{ 'male': p.gender === '男', 'female': p.gender === '女' }" v-if="p.gender">
                {{ p.gender === '男' ? '♂' : (p.gender === '女' ? '♀' : '') }}
              </text>
              <text class="name">{{ p.nickname || p.name }}</text>
              <text class="status-tag">候补</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 对战签表 Tab -->
    <view v-if="currentTab === 1">
      <view class="header">
        <text class="title">比赛对战</text>
        <button class="btn-add-mini" @click="showAddMatchModal" v-if="isAdminOrReferee">添加对战</button>
      </view>

      <view v-if="games.length === 0" class="empty-tip">
        <text>暂无对战安排</text>
      </view>

      <view class="game-list">
        <view class="game-card" v-for="game in games" :key="game.id">
          <view class="player-block left">
            <view class="name-wrapper">
              <text class="player-name">{{ game.player1.name || 'Player 1' }}</text>
              <text class="winner-text" v-if="game.score1 > game.score2">WINNER</text>
            </view>
            <input 
              class="score-input" 
              type="number" 
              :value="game.score1" 
              :disabled="!isAdminOrReferee"
              @blur="(e) => handleScoreBlur(game, 'score1', e)"
            />
          </view>
          
          <view class="vs-divider">
            <text class="vs-text-fancy">VS</text>
          </view>

          <view class="player-block right">
            <input 
              class="score-input" 
              type="number" 
              :value="game.score2" 
              :disabled="!isAdminOrReferee"
              @blur="(e) => handleScoreBlur(game, 'score2', e)"
            />
            <view class="name-wrapper right">
              <text class="player-name">{{ game.player2.name || 'Player 2' }}</text>
              <text class="winner-text" v-if="game.score2 > game.score1">WINNER</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加对战弹窗 -->
    <view class="modal-mask" v-if="showModal" @click="showModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择两名选手</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view 
            class="select-item" 
            v-for="p in mainDraw" 
            :key="p.id" 
            @click="toggleSelection(p)"
            :class="{ selected: selectedPlayers.includes(p.playerId) }"
          >
            <text>{{ p.nickname || p.name }}</text>
            <text v-if="selectedPlayers.includes(p.playerId)" class="check-mark">✓</text>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">取消</button>
          <button class="btn-confirm" @click="confirmMatch" :disabled="selectedPlayers.length !== 2">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getMatchParticipants, getGames, createGame, updateGameScore, getUserApplications, getMatches } from '../../api';

const currentTab = ref(0);
const participants = ref<any[]>([]);
const games = ref<any[]>([]);
const matchId = ref<number | null>(null);
const currentUser = ref<any>(null);
const isAdminOrReferee = ref(false);
const isRegistered = ref(false);

// Modal state
const showModal = ref(false);
const selectedPlayers = ref<number[]>([]);

const mainDraw = computed(() => participants.value.filter(p => p.status !== 'WAITLIST'));
const waitList = computed(() => participants.value.filter(p => p.status === 'WAITLIST'));

onLoad((options: any) => {
  if (options.id) {
    matchId.value = Number(options.id);
  }
  const userInfo = uni.getStorageSync('userInfo');
  if (userInfo) {
    currentUser.value = userInfo;
  }
});

onShow(() => {
  if (matchId.value) {
    fetchParticipants(matchId.value);
    fetchGames(matchId.value);
    checkUserStatus();
  }
});

const checkUserStatus = async () => {
  if (!currentUser.value || !matchId.value) return;

  // Check Registration
  try {
    const apps = await getUserApplications();
    const myApp = (apps as any[]).find((a: any) => a.tournamentId === matchId.value && ['APPROVED', 'WAITLIST'].includes(a.status));
    isRegistered.value = !!myApp;
  } catch (e) {
    console.error(e);
  }

  // Check Admin/Referee
  if (currentUser.value.role === 'ADMIN' || currentUser.value.role === 'SUPER_ADMIN') {
    isAdminOrReferee.value = true;
    return;
  }
  
  // Check if referee for this match
  // Ideally we call an API, but for now let's fetch match details or use existing logic if available
  // Simulating check:
  try {
     const matches = await getMatches();
     const match = (matches as any[]).find(m => m.id === matchId.value);
     if (match && match.referees) {
        const isRef = match.referees.some((r: any) => r.playerId === currentUser.value.id);
        if (isRef) isAdminOrReferee.value = true;
     }
  } catch (e) { console.error(e); }
};

const fetchParticipants = async (id: number) => {
  try {
    const res = await getMatchParticipants(id);
    participants.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};

const fetchGames = async (id: number) => {
  try {
    const res = await getGames(id);
    games.value = res as any[];
  } catch (err) {
    console.error(err);
  }
};

const goToRegister = () => {
  if (matchId.value) {
    uni.navigateTo({ url: `/pages/match/register?id=${matchId.value}` });
  }
};

// Match Management
const showAddMatchModal = () => {
  selectedPlayers.value = [];
  showModal.value = true;
};

const toggleSelection = (p: any) => {
  const idx = selectedPlayers.value.indexOf(p.playerId);
  if (idx > -1) {
    selectedPlayers.value.splice(idx, 1);
  } else {
    if (selectedPlayers.value.length < 2) {
      selectedPlayers.value.push(p.playerId);
    } else {
      uni.showToast({ title: '只能选择两名选手', icon: 'none' });
    }
  }
};

const confirmMatch = async () => {
  if (selectedPlayers.value.length !== 2) return;
  
  try {
    await createGame(matchId.value!, {
      player1Id: selectedPlayers.value[0],
      player2Id: selectedPlayers.value[1]
    });
    showModal.value = false;
    fetchGames(matchId.value!);
    uni.showToast({ title: '添加成功' });
  } catch (err) {
    uni.showToast({ title: '添加失败', icon: 'none' });
  }
};

const updateScore = async (game: any, field: 'score1' | 'score2', value: string) => {
  if (!isAdminOrReferee.value) return;
  
  // Optimistic update
  const originalVal = game[field];
  game[field] = value;
  
  try {
    await updateGameScore(game.id, {
      score1: game.score1,
      score2: game.score2
    });
  } catch (err) {
    game[field] = originalVal; // Revert
    uni.showToast({ title: '更新分数失败', icon: 'none' });
  }
};

const handleScoreBlur = (game: any, field: 'score1' | 'score2', e: any) => {
  updateScore(game, field, e.detail.value);
};
</script>

<style>
.container { padding: 0; min-height: 100vh; background-color: #f5f5f5; }
.tabs { display: flex; background: #fff; padding: 10px 0; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
.tab-item { flex: 1; text-align: center; font-size: 16px; color: #666; padding-bottom: 8px; position: relative; }
.tab-item.active { color: #3A5F0B; font-weight: bold; }
.tab-item.active::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 30px; height: 3px; background: #3A5F0B; border-radius: 2px; }

.header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: bold; color: #333; }
.btn-register-mini { font-size: 12px; background-color: #3A5F0B; color: white; padding: 0 15px; height: 30px; line-height: 30px; border-radius: 15px; margin: 0; }
.btn-add-mini { font-size: 12px; background-color: #2e86de; color: white; padding: 0 15px; height: 30px; line-height: 30px; border-radius: 15px; margin: 0; }

.list-section { margin-bottom: 20px; padding: 0 20px; }
.section-title { font-size: 14px; color: #666; margin-bottom: 10px; font-weight: bold; padding-left: 5px; border-left: 3px solid #FFD700; }
.participant-list { background: #fff; border-radius: 8px; overflow: hidden; }
.participant-list.waitlist { background: #f9f9f9; }
.participant-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f5f5f5; }
.participant-item:last-child { border-bottom: none; }
.index { width: 30px; color: #999; font-weight: bold; }
.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 15px; background-color: #f0f0f0; }
.avatar-placeholder { width: 40px; height: 40px; background: #e0e0e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; color: #666; font-size: 16px; font-weight: bold; }
.name { font-size: 16px; color: #333; }
.name-container { display: flex; align-items: center; }
.gender-icon { font-size: 14px; margin-right: 4px; font-weight: bold; }
.gender-icon.male { color: #2196F3; }
.gender-icon.female { color: #E91E63; }
.status-tag { font-size: 10px; color: #f39c12; border: 1px solid #f39c12; padding: 1px 4px; border-radius: 4px; margin-left: 8px; }
.empty-tip { text-align: center; padding: 40px; color: #999; }

/* Game Card Styles */
.game-list { padding: 0 20px; }
.game-card { background: #fff; border-radius: 12px; margin-bottom: 15px; padding: 20px 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.player-block { flex: 1; display: flex; align-items: center; gap: 10px; position: relative; }
.player-block.left { justify-content: flex-end; }
.player-block.right { justify-content: flex-start; }
.name-wrapper { position: relative; display: flex; flex-direction: column; align-items: flex-end; }
.name-wrapper.right { align-items: flex-start; }
.player-name { font-size: 14px; font-weight: bold; color: #333; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
.score-input { width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; text-align: center; font-size: 18px; font-weight: bold; color: #3A5F0B; z-index: 1; flex-shrink: 0; }
.vs-divider { display: flex; flex-direction: column; align-items: center; padding: 0 20px; flex-shrink: 0; }
.vs-text-fancy { 
  font-size: 24px; 
  font-weight: 900; 
  color: transparent;
  background: linear-gradient(45deg, #FFD700, #ff6b6b);
  -webkit-background-clip: text;
  background-clip: text;
  font-style: italic; 
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
  letter-spacing: -2px;
}
.winner-text {
  position: absolute;
  top: -14px;
  right: -5px;
  font-size: 10px;
  font-weight: 900;
  font-style: italic;
  background: linear-gradient(90deg, #FFD700, #ff6b6b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 1px;
  transform: rotate(0deg);
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  animation: fade-in 0.5s ease-out;
  white-space: nowrap;
}
.name-wrapper.right .winner-text {
  right: auto;
  left: -5px;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modal Styles */
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal-content { background: #fff; width: 80%; max-height: 70vh; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { padding: 15px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; }
.modal-body { flex: 1; overflow-y: auto; padding: 10px; }
.select-item { padding: 12px; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; }
.select-item.selected { background: #e8f5e9; color: #3A5F0B; font-weight: bold; }
.check-mark { color: #3A5F0B; font-weight: bold; }
.modal-footer { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; }
.btn-cancel { flex: 1; background: #eee; color: #666; font-size: 14px; }
.btn-confirm { flex: 1; background: #3A5F0B; color: white; font-size: 14px; }
.btn-confirm[disabled] { background: #ccc; }
</style>
