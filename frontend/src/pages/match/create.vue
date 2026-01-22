<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label">赛事名称</text>
        <input class="input" v-model="form.name" placeholder="请输入赛事名称" />
      </view>

      <view class="form-item">
        <text class="label">地区</text>
        <picker @change="bindRegionChange" :value="regionIndex" :range="jiangsuCities">
          <view class="picker-view">
            {{ form.region ? '江苏省 ' + form.region : '请选择地区' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">比赛类型</text>
        <picker @change="bindMatchTypeChange" :value="matchTypeIndex" :range="matchTypes">
          <view class="picker-view">
            {{ form.matchType || '请选择比赛类型' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">签位数量</text>
        <input class="input" v-model="form.drawSize" placeholder="请输入签位数量" type="number" />
      </view>

      <view class="form-item">
        <text class="label">报名费用 (元/人)</text>
        <input class="input" v-model="form.fee" placeholder="请输入报名费用" type="number" />
      </view>

      <view class="form-item">
        <text class="label">比赛级别</text>
        <picker @change="bindLevelChange" :value="levelIndex" :range="levels">
          <view class="picker-view">
            {{ form.level || '请选择比赛级别' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">地点</text>
        <view class="location-wrapper">
          <input class="input location-input" v-model="form.location" placeholder="例如：1号场" placeholder-style="z-index: 0" />
          <view class="icon-location" @click="chooseLocation">📍</view>
        </view>
      </view>
    
    <view class="form-group">
      <text class="label">比赛时间</text>
      <picker mode="date" :value="form.date" start="2025-01-01" end="2030-12-31" @change="bindDateChange">
        <view class="picker-view">
          {{ form.date || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.time" start="00:00" end="23:59" @change="bindTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.time || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">报名开始时间</text>
      <picker mode="date" :value="form.regStartDate" start="2025-01-01" end="2030-12-31" @change="bindRegStartDateChange">
        <view class="picker-view">
          {{ form.regStartDate || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.regStartTime" start="00:00" end="23:59" @change="bindRegStartTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.regStartTime || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">报名截止时间</text>
      <picker mode="date" :value="form.regEndDate" start="2025-01-01" end="2030-12-31" @change="bindRegEndDateChange">
        <view class="picker-view">
          {{ form.regEndDate || '请选择日期' }}
        </view>
      </picker>
      <picker mode="time" :value="form.regEndTime" start="00:00" end="23:59" @change="bindRegEndTimeChange" style="margin-top: 10px;">
        <view class="picker-view">
          {{ form.regEndTime || '请选择时间' }}
        </view>
      </picker>
    </view>

    <view class="form-group">
      <text class="label">规则</text>
      <textarea class="textarea" v-model="form.rules" placeholder="规则描述..." />
    </view>

    <view class="form-group">
      <text class="label">退赛须知</text>
      <textarea class="textarea" v-model="form.withdrawalNotice" placeholder="例如：开赛前96小时外可免费退赛..." />
    </view>

    <view class="form-group">
      <text class="label">联系方式</text>
      <input class="input" v-model="form.contact" placeholder="请输入举办方联系方式（如手机号）" />
    </view>

    <button class="btn-submit" @click="submit" :loading="loading">{{ isEdit ? '保存赛事' : '创建赛事' }}</button>
  </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { createMatch, updateMatch, getMatches } from '../../api';

const isEdit = ref(false);
const loading = ref(false);
const matchId = ref(0);
const categories = ['周赛', '月赛', '公开赛', '大奖赛'];
const levels = ['10', '25', '50', '100', '200', '400', '500', '1000'];
const matchTypes = ['单打', '双打'];
const jiangsuCities = ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'];
const matchTypeIndex = ref(-1);
const levelIndex = ref(-1);
const form = ref({
  name: '',
  location: '',
  region: '',
  latitude: 0,
  longitude: 0,
  date: '',
  time: '08:00',
  regStartDate: '',
  regStartTime: '08:00',
  regEndDate: '',
  regEndTime: '08:00',
  matchType: '',
  level: '',
  drawSize: '',
  fee: '',
  rules: '',
  description: '',
  withdrawalNotice: '',
  contact: ''
});

const regionIndex = computed(() => {
  return jiangsuCities.indexOf(form.value.region);
});

const bindRegionChange = (e: any) => {
  form.value.region = jiangsuCities[e.detail.value];
};

onLoad(async (options: any) => {
  if (options.id) {
    isEdit.value = true;
    matchId.value = Number(options.id);
    uni.setNavigationBarTitle({ title: '编辑赛事' });
    
    const matches: any = await getMatches();
    const match = matches.find((m: any) => m.id === matchId.value);
    if (match) {
      const start = new Date(match.startTime);
      form.value.name = match.name;
      form.value.location = match.location;
      form.value.region = match.region || '';
      form.value.latitude = match.latitude || 0;
      form.value.longitude = match.longitude || 0;
      form.value.date = start.toISOString().split('T')[0];
      form.value.time = start.toTimeString().slice(0, 5);
      form.value.matchType = match.matchType || '';
      form.value.drawSize = match.drawSize || '';
      form.value.fee = match.fee || '';
      form.value.description = match.description || '';
      form.value.rules = match.rules || '';
      form.value.withdrawalNotice = match.withdrawalNotice || '';
      form.value.contact = match.contact || '';
      
      // Set picker index
      if (form.value.matchType) {
        matchTypeIndex.value = matchTypes.indexOf(form.value.matchType);
      }
      if (match.level) {
        const levelStr = String(match.level);
        levelIndex.value = levels.indexOf(levelStr);
        form.value.level = levelStr;
      }
      
      if (match.registrationStart) {
         const rs = new Date(match.registrationStart);
         form.value.regStartDate = rs.toISOString().split('T')[0];
         form.value.regStartTime = rs.toTimeString().slice(0, 5);
      }
      if (match.registrationEnd) {
         const re = new Date(match.registrationEnd);
         form.value.regEndDate = re.toISOString().split('T')[0];
         form.value.regEndTime = re.toTimeString().slice(0, 5);
      }
    }
  } else {
    uni.setNavigationBarTitle({ title: '创建赛事' });
  }
});

const chooseLocation = () => {
  uni.chooseLocation({
    success: (res: any) => {
      console.log('Chosen location:', res);
      form.value.location = res.name || res.address;
      form.value.latitude = res.latitude;
      form.value.longitude = res.longitude;
    },
    fail: (err: any) => {
      console.error('Choose location failed:', err);
      // Need permission in manifest.json for mp-weixin
    }
  });
};

const bindMatchTypeChange = (e: any) => {
  const index = e.detail.value;
  matchTypeIndex.value = index;
  form.value.matchType = matchTypes[index];
};

const bindLevelChange = (e: any) => {
  const index = e.detail.value;
  levelIndex.value = index;
  form.value.level = levels[index];
};

const bindDateChange = (e: any) => {
  form.value.date = e.detail.value;
};

const bindTimeChange = (e: any) => {
  form.value.time = e.detail.value;
};

const bindRegStartDateChange = (e: any) => {
  form.value.regStartDate = e.detail.value;
};

const bindRegStartTimeChange = (e: any) => {
  form.value.regStartTime = e.detail.value;
};

const bindRegEndDateChange = (e: any) => {
  form.value.regEndDate = e.detail.value;
};

const bindRegEndTimeChange = (e: any) => {
  form.value.regEndTime = e.detail.value;
};

const submit = async () => {
  if (!form.value.name || !form.value.location || !form.value.date || !form.value.time) {
    uni.showToast({ title: '请填写必填信息（名称、地点、比赛时间）', icon: 'none' });
    return;
  }
  
  // Validate Registration Dates if partial
  if ((form.value.regStartDate && !form.value.regStartTime) || (!form.value.regStartDate && form.value.regStartTime)) {
    uni.showToast({ title: '请完整填写报名开始时间', icon: 'none' });
    return;
  }
  if ((form.value.regEndDate && !form.value.regEndTime) || (!form.value.regEndDate && form.value.regEndTime)) {
    uni.showToast({ title: '请完整填写报名截止时间', icon: 'none' });
    return;
  }

  const data = {
    ...form.value,
    startTime: `${form.value.date} ${form.value.time}`.replace(/-/g, '/'), // Fix for iOS/Safari
    registrationStart: (form.value.regStartDate && form.value.regStartTime) ? `${form.value.regStartDate} ${form.value.regStartTime}`.replace(/-/g, '/') : null,
    registrationEnd: (form.value.regEndDate && form.value.regEndTime) ? `${form.value.regEndDate} ${form.value.regEndTime}`.replace(/-/g, '/') : null,
    drawSize: form.value.drawSize ? Number(form.value.drawSize) : null,
    fee: form.value.fee ? Number(form.value.fee) : null
  };

  loading.value = true;
  try {
    if (isEdit.value && matchId.value) {
      await updateMatch(matchId.value, data);
      uni.showToast({ title: '修改成功' });
    } else {
      await createMatch(data);
      uni.showToast({ title: '创建成功' });
    }
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err: any) {
    console.error('Submit match error:', err);
    // Extract error message safely
    const msg = (err.data && err.data.error) || err.message || '提交失败';
    uni.showToast({ title: msg, icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style>
.container { padding: 20px; background-color: #fff; min-height: 100vh; }
.location-wrapper { display: flex; align-items: center; }
.location-input { flex: 1; margin-right: 10px; }
.icon-location { font-size: 24px; padding: 5px; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 5px; font-weight: bold; }
.input { width: 100%; height: 44px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.picker-view { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 20px; }
</style>
