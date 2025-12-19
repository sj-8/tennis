<template>
  <div class="dashboard">
    <el-header class="header">
      <h3>Tennis Land Management</h3>
      <el-button @click="logout">Logout</el-button>
    </el-header>
    
    <el-main>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Player Applications" name="applications">
          <el-table :data="applications" style="width: 100%">
            <el-table-column prop="realName" label="Name" />
            <el-table-column prop="phone" label="Phone" />
            <el-table-column prop="project" label="Project" />
            <el-table-column prop="status" label="Status">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Actions">
              <template #default="scope">
                <el-button size="small" type="success" @click="audit(scope.row, 'APPROVED')" v-if="scope.row.status === 'PENDING'">Approve</el-button>
                <el-button size="small" type="danger" @click="audit(scope.row, 'REJECTED')" v-if="scope.row.status === 'PENDING'">Reject</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="Audit Logs" name="logs">
          <el-table :data="logs" style="width: 100%">
            <el-table-column prop="admin.username" label="Admin" />
            <el-table-column prop="action" label="Action" />
            <el-table-column prop="application.realName" label="Target Player" />
            <el-table-column prop="createdAt" label="Time" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const activeTab = ref('applications')
const applications = ref([])
const logs = ref([])
const API_URL = 'http://localhost:3000/api'

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
})

const fetchData = async () => {
  try {
    const appRes = await axios.get(`${API_URL}/admin/applications`, getAuthHeader())
    applications.value = appRes.data
    
    const logRes = await axios.get(`${API_URL}/admin/audit-logs`, getAuthHeader())
    logs.value = logRes.data
  } catch (err: any) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      logout()
    }
  }
}

const audit = async (row: any, status: string) => {
  try {
    await ElMessageBox.confirm(`Are you sure to ${status.toLowerCase()} this application?`)
    await axios.post(`${API_URL}/admin/applications/${row.id}/audit`, { status }, getAuthHeader())
    ElMessage.success('Audit successful')
    fetchData()
  } catch (err) {
    // cancelled or error
  }
}

const getStatusType = (status: string) => {
  const map: any = { APPROVED: 'success', REJECTED: 'danger', PENDING: 'warning' }
  return map[status] || 'info'
}

const logout = () => {
  localStorage.removeItem('adminToken')
  router.push('/login')
}

onMounted(fetchData)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  padding: 0 20px;
}
</style>
