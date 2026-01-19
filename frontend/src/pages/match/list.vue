<template>
  <view class="container">
    <view class="header-filters">
      <view class="filter-row">
        <picker class="filter-item" :range="regions" @change="onRegionChange" :value="regionIndex">
          <view class="picker-label">{{ region || '区域' }} <text class="arrow">▼</text></view>
        </picker>
        <picker class="filter-item" :range="categories" @change="onCategoryChange" :value="categoryIndex">
          <view class="picker-label">{{ category || '类别' }} <text class="arrow">▼</text></view>
        </picker>
        <picker class="filter-item" :range="levels" @change="onLevelChange" :value="levelIndex">
          <view class="picker-label">{{ level || '级别' }} <text class="arrow">▼</text></view>
        </picker>
        <picker class="filter-item" :range="matchTypes" @change="onMatchTypeChange" :value="matchTypeIndex">
          <view class="picker-label">{{ matchType || '类型' }} <text class="arrow">▼</text></view>
        </picker>
        <picker class="filter-item" :range="statuses" @change="onStatusChange" :value="statusIndex">
          <view class="picker-label highlight">{{ status || '状态' }} <text class="arrow">▼</text></view>
        </picker>
      </view>
      
      <view class="search-bar">
        <text class="search-icon">🔍</text>
        <input class="search-input" v-model="searchKeyword" placeholder="请输入比赛入关键宇" confirm-type="search" @confirm="onSearch" />
      </view>
    </view>

    <view class="match-list">
      <view v-for="match in matches" :key="match.id" class="match-card" @click="goToDetail(match)">
        <!-- Image placeholder or actual image if available -->
        <!-- <image class="match-cover" :src="match.cover || '/static/default-cover.png'" mode="aspectFill" /> -->
        
        <view class="card-content">
          <view class="title-row">
            <text class="status-tag" :class="getStatusClass(match.status)">{{ getStatusText(match.status) }}</text>
            <text class="match-title">{{ match.name }}</text>
          </view>
          
          <view class="info-row">
            <text class="icon">🕒</text>
            <text>{{ formatDate(match.startTime) }}</text>
          </view>
          
          <view class="info-row">
            <text class="icon">📍</text>
            <text>{{ match.location }}</text>
            <view class="nav-btn" @click.stop="openLocation(match)" v-if="match.latitude && match.longitude">
               <text>导航</text>
            </view>
          </view>
          
          <view class="tags-row">
            <text class="tag">{{ match.category || '公开赛' }}</text>
            <text class="tag">{{ match.matchType || '不限' }}</text>
            <text class="tag">{{ match.level || '无级别' }}</text>
          </view>
          
          <view class="footer-row">
            <text class="participants">已报名 {{ match._count?.applications || 0 }}/{{ match.drawSize || '∞' }}</text>
          </view>
        </view>
      </view>
      
      <view v-if="matches.length === 0" class="empty-tip">
        <image class="empty-img" src="/static/empty.png" mode="aspectFit" v-if="false" /> <!-- Use text for now -->
        <text>暂无数据</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { request } from '../../api';

const matches = ref<any[]>([]);
const searchKeyword = ref('');

// Filters
const regions = ['全部', '南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'];
const categories = ['全部', '周赛', '月赛', '公开赛', '大奖赛'];
const levels = ['全部', '10', '25', '50', '100', '200', '400', '500', '1000'];
const matchTypes = ['全部', '男单', '男双', '女单', '女双', '混双'];
const statuses = ['全部', '待开始', '进行中', '已结束'];

const region = ref('区域');
const category = ref('类别');
const level = ref('级别');
const matchType = ref('类型');
const status = ref('待开始'); // Default from screenshot

const regionIndex = ref(0);
const categoryIndex = ref(0);
const levelIndex = ref(0);
const matchTypeIndex = ref(0);
const statusIndex = ref(1); // Default '待开始'

const onRegionChange = (e: any) => { regionIndex.value = e.detail.value; region.value = regions[e.detail.value]; fetchMatches(); };
const onCategoryChange = (e: any) => { categoryIndex.value = e.detail.value; category.value = categories[e.detail.value]; fetchMatches(); };
const onLevelChange = (e: any) => { levelIndex.value = e.detail.value; level.value = levels[e.detail.value]; fetchMatches(); };
const onMatchTypeChange = (e: any) => { matchTypeIndex.value = e.detail.value; matchType.value = matchTypes[e.detail.value]; fetchMatches(); };
const onStatusChange = (e: any) => { statusIndex.value = e.detail.value; status.value = statuses[e.detail.value]; fetchMatches(); };

const onSearch = () => {
  fetchMatches();
};

const fetchMatches = async () => {
  uni.showLoading({ title: '加载中...' });
  try {
    const params: any = {};
    if (region.value !== '区域' && region.value !== '全部') params.region = region.value;
    if (category.value !== '类别' && category.value !== '全部') params.category = category.value;
    if (level.value !== '级别' && level.value !== '全部') params.level = level.value;
    if (matchType.value !== '类型' && matchType.value !== '全部') params.matchType = matchType.value;
    if (status.value !== '状态' && status.value !== '全部') params.status = status.value;
    if (searchKeyword.value) params.search = searchKeyword.value;

    // Convert params to query string manually or use request helper
    // Our request helper supports data, but for GET it usually appends to query?
    // uni.request/wx.cloud.callContainer with GET data is usually query params.
    // Let's pass as data.
    
    const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
    const url = `/matches${queryString ? '?' + queryString : ''}`;
    
    const res: any = await request({ url });
    matches.value = res;
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.toTimeString().slice(0, 5)} ${weekDay}`;
};

const getStatusText = (status: string) => {
  if (status === 'PENDING') return '报名中'; // Map PENDING to '报名中' for users? Or '待开始'?
  // DB status: PENDING, ONGOING, COMPLETED.
  // Screenshot has '已结束' tag.
  if (status === 'PENDING') return '报名中'; 
  if (status === 'ONGOING') return '进行中';
  if (status === 'COMPLETED') return '已结束';
  return status;
};

const getStatusClass = (status: string) => {
  if (status === 'PENDING') return 'status-green';
  if (status === 'ONGOING') return 'status-blue';
  return 'status-gray';
};

const goToDetail = (match: any) => {
  uni.navigateTo({ url: `/pages/match/register?id=${match.id}` });
};

const openLocation = (match: any) => {
  uni.openLocation({
    latitude: Number(match.latitude),
    longitude: Number(match.longitude),
    name: match.location,
    address: match.location
  });
};

onMounted(() => {
  fetchMatches();
});
</script>

<style>
.container { background-color: #f8f8f8; min-height: 100vh; }
.header-filters { background: #9c27b0; padding: 10px 0; color: white; position: sticky; top: 0; z-index: 100; }
.filter-row { display: flex; justify-content: space-around; padding-bottom: 10px; font-size: 14px; }
.filter-item { flex: 1; text-align: center; }
.picker-label { display: flex; align-items: center; justify-content: center; }
.picker-label.highlight { color: #fff; font-weight: bold; }
.arrow { font-size: 10px; margin-left: 4px; opacity: 0.8; }

.search-bar { margin: 0 15px; background: white; border-radius: 4px; display: flex; align-items: center; padding: 8px 10px; }
.search-icon { color: #999; margin-right: 5px; }
.search-input { flex: 1; font-size: 14px; color: #333; }

.match-list { padding: 15px; }
.match-card { background: white; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.title-row { display: flex; align-items: flex-start; margin-bottom: 10px; }
.status-tag { font-size: 10px; padding: 2px 4px; border-radius: 2px; margin-right: 8px; white-space: nowrap; height: 16px; line-height: 16px; }
.status-green { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
.status-blue { background: #e3f2fd; color: #1565c0; border: 1px solid #bbdefb; }
.status-gray { background: #f5f5f5; color: #757575; border: 1px solid #e0e0e0; }
.match-title { font-size: 16px; font-weight: bold; color: #333; line-height: 1.4; flex: 1; }

.info-row { display: flex; align-items: center; color: #666; font-size: 12px; margin-bottom: 6px; }
.icon { margin-right: 6px; width: 16px; text-align: center; }

.tags-row { display: flex; gap: 8px; margin-top: 10px; margin-bottom: 10px; }
.tag { font-size: 10px; background: #f3e5f5; color: #7b1fa2; padding: 2px 6px; border-radius: 4px; }

.footer-row { border-top: 1px solid #f0f0f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.participants { color: #9c27b0; font-weight: bold; }

.nav-btn { background: #3A5F0B; color: white; font-size: 10px; padding: 1px 6px; border-radius: 8px; margin-left: 8px; display: inline-block; }

.empty-tip { text-align: center; margin-top: 50px; color: #999; font-size: 14px; }
.empty-img { width: 100px; height: 100px; margin-bottom: 10px; }
</style>