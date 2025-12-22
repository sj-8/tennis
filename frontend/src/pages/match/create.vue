<template>
  <view class="container">
    <view class="form-group">
      <text class="label">赛事名称</text>
      <input class="input" v-model="form.name" placeholder="例如：周日公开赛" placeholder-style="z-index: 0" />
    </view>
    
    <view class="form-group">
      <text class="label">地点</text>
      <input class="input" v-model="form.location" placeholder="例如：1号场" placeholder-style="z-index: 0" />
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

    <button class="btn-submit" @click="submit">创建赛事</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { createMatch, updateMatch, getMatches } from '../../api';

const isEdit = ref(false);
const matchId = ref(0);
const form = ref({
  name: '',
  location: '',
  date: '',
  time: '',
  regStartDate: '',
  regStartTime: '',
  regEndDate: '',
  regEndTime: '',
  drawSize: '',
  rules: '',
  description: ''
});

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
      form.value.date = start.toISOString().split('T')[0];
      form.value.time = start.toTimeString().slice(0, 5);
      form.value.drawSize = match.drawSize || '';
      form.value.description = match.description || '';
      form.value.rules = match.rules || '';
      
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

  try {
    const startTime = `${form.value.date}T${form.value.time}:00`;
    const registrationStart = form.value.regStartDate && form.value.regStartTime ? `${form.value.regStartDate}T${form.value.regStartTime}:00` : undefined;
    const registrationEnd = form.value.regEndDate && form.value.regEndTime ? `${form.value.regEndDate}T${form.value.regEndTime}:00` : undefined;
    
    const data = { ...form.value, startTime, registrationStart, registrationEnd };
    
    if (isEdit.value) {
      await updateMatch(matchId.value, data);
      uni.showToast({ title: '赛事已更新' });
    } else {
      await createMatch(data);
      uni.showToast({ title: '赛事已创建' });
    }
    
    setTimeout(() => {
      // Check page stack to prevent navigateBack failure
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        // Fallback if no history (e.g. entered directly or cleared stack)
        uni.switchTab({ url: '/pages/index/index' });
      }
    }, 1500);
  } catch (err: any) {
    console.error('Submit match error:', err);
    uni.showToast({ title: err.message || '操作失败', icon: 'none' });
  }
};
</script>

<style>
.container { padding: 20px; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 5px; font-weight: bold; }
.input { width: 100%; height: 44px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.picker-view { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 20px; }
</style>
