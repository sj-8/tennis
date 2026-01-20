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
        <button class="btn-add-mini" @click="showAddGroupModal" v-if="isAdminOrReferee">添加比赛组</button>
      </view>

      <view v-if="groups.length === 0 && ungroupedGames.length === 0" class="empty-tip">
        <text>暂无对战安排</text>
      </view>

      <!-- Groups List -->
      <view class="group-list">
        <view class="group-card" v-for="group in groups" :key="group.id">
            <view class="group-header">
                <text class="group-title" @click="isAdminOrReferee && showEditGroup(group)">{{ group.title }} <text class="edit-icon" v-if="isAdminOrReferee">✎</text></text>
                <view class="group-actions" v-if="isAdminOrReferee">
                    <button class="btn-add-match-mini" @click="showAddMatchModal(group.id)">+ 对战</button>
                    <button class="btn-delete-mini" @click="handleDeleteGroup(group)">×</button>
                </view>
            </view>
            <view class="game-list">
                <view class="game-card" v-for="game in group.games" :key="game.id">
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
      </view>

      <!-- Ungrouped Games -->
      <view class="game-list" v-if="ungroupedGames.length > 0">
        <view class="section-title">未分组对战</view>
        <view class="game-card" v-for="game in ungroupedGames" :key="game.id">
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

    <!-- 添加分组弹窗 -->
    <view class="modal-mask" v-if="showGroupModal" @click="showGroupModal = false">
      <view class="modal-content small" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingGroupId ? '编辑分组' : '新建分组' }}</text>
        </view>
        <view class="modal-body">
            <input class="group-input" v-model="groupTitle" placeholder="请输入分组名称 (如：小组赛A组)" />
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="showGroupModal = false">取消</button>
          <button class="btn-confirm" @click="confirmGroup">确定</button>
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
import { getMatchParticipants, getGames, createGame, updateGameScore, getUserApplications, getMatches, getGroups, createGroup, updateGroup, deleteGroup } from '../../api';

const currentTab = ref(0);
const participants = ref<any[]>([]);
const games = ref<any[]>([]);
const groups = ref<any[]>([]);
const matchId = ref<number | null>(null);
const currentUser = ref<any>(null);
const isAdminOrReferee = ref(false);
const isRegistered = ref(false);

// Modal state
const showModal = ref(false);
const selectedPlayers = ref<number[]>([]);
const activeGroupId = ref<number | null>(null);

// Group Edit State
const showGroupModal = ref(false);
const groupTitle = ref('');
const editingGroupId = ref<number | null>(null);

const mainDraw = computed(() => participants.value.filter(p => p.status !== 'WAITLIST'));
const waitList = computed(() => participants.value.filter(p => p.status === 'WAITLIST'));
const ungroupedGames = computed(() => games.value.filter(g => !g.groupId));

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
    fetchData(matchId.value);
    checkUserStatus();
  }
});

const fetchData = async (id: number) => {
    await Promise.all([fetchGames(id), fetchGroups(id)]);
};

const fetchGroups = async (id: number) => {
    try {
        const res = await getGroups(id);
        groups.value = res as any[];
    } catch (err) {
        console.error(err);
    }
};

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

// Group Management
const showAddGroupModal = () => {
    editingGroupId.value = null;
    groupTitle.value = '';
    showGroupModal.value = true;
};

const showEditGroup = (group: any) => {
    editingGroupId.value = group.id;
    groupTitle.value = group.title;
    showGroupModal.value = true;
};

const confirmGroup = async () => {
    if (!groupTitle.value) return;
    try {
        if (editingGroupId.value) {
            await updateGroup(editingGroupId.value, groupTitle.value);
        } else {
            await createGroup(matchId.value!, groupTitle.value);
        }
        showGroupModal.value = false;
        fetchGroups(matchId.value!);
    } catch (err) {
        uni.showToast({ title: '操作失败', icon: 'none' });
    }
};

const handleDeleteGroup = async (group: any) => {
    uni.showModal({
        title: '确认删除',
        content: '删除分组将同时删除组内所有对战，确定吗？',
        success: async (res) => {
            if (res.confirm) {
                try {
                    await deleteGroup(group.id);
                    fetchGroups(matchId.value!);
                    fetchGames(matchId.value!); // Also refresh games as they might be deleted
                } catch (err) {
                    uni.showToast({ title: '删除失败', icon: 'none' });
                }
            }
        }
    });
};

// Match Management
const showAddMatchModal = (groupId: number | null = null) => {
  activeGroupId.value = groupId;
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
      player2Id: selectedPlayers.value[1],
      groupId: activeGroupId.value
    });
    showModal.value = false;
    // Refresh both to be safe
    fetchGames(matchId.value!);
    fetchGroups(matchId.value!);
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
.btn-add-match-mini { font-size: 11px; background-color: #3A5F0B; color: white; padding: 0 10px; height: 24px; line-height: 24px; border-radius: 12px; margin: 0; }
.btn-delete-mini { font-size: 14px; background-color: transparent; color: #999; padding: 0 10px; height: 24px; line-height: 24px; margin: 0; font-weight: bold; }

.group-list { padding: 0 20px; }
.group-card { background: #fff; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.group-header { background: #f9f9f9; padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.group-title { font-weight: bold; color: #333; font-size: 15px; display: flex; align-items: center; }
.edit-icon { font-size: 12px; color: #999; margin-left: 5px; }
.group-actions { display: flex; align-items: center; gap: 5px; }

.modal-content.small { width: 70%; max-height: auto; }
.group-input { width: 100%; height: 40px; border: 1px solid #eee; padding: 0 10px; border-radius: 4px; margin-top: 10px; background: #f9f9f9; }

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
