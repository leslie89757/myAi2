import React from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  SelectInput,
  NumberInput,
  ArrayInput,
  SimpleFormIterator,
  required,
  useDataProvider,
  useNotify,
  Loading,
  SaveButton,
  Toolbar,
  useRedirect
} from 'react-admin';
import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { useState, useEffect } from 'react';

// 自定义工具栏，提供保存按钮
const ConfigToolbar = props => (
  <Toolbar {...props}>
    <SaveButton label="保存配置" />
  </Toolbar>
);

// 系统配置编辑表单
export const SystemConfigEdit = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  // 加载配置
  useEffect(() => {
    dataProvider.getList('config', {
      pagination: { page: 1, perPage: 100 },
      sort: { field: 'key', order: 'ASC' },
      filter: {}
    })
      .then(({ data }) => {
        // 将配置数据转换为表单需要的格式
        const configData = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        setConfigs(configData);
        setLoading(false);
      })
      .catch(error => {
        notify('加载配置失败', { type: 'error' });
        setLoading(false);
      });
  }, []);

  const handleSubmit = values => {
    return dataProvider.update('config', { id: 'all', data: values })
      .then(() => {
        notify('配置已保存', { type: 'success' });
      })
      .catch(error => {
        notify(`保存失败: ${error.message}`, { type: 'error' });
      });
  };

  // 加载中状态显示
  if (loading) return <Loading />;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>系统配置</Typography>
        <SimpleForm 
          record={configs} 
          onSubmit={handleSubmit}
          toolbar={<ConfigToolbar />}
        >
          <Typography variant="subtitle1" gutterBottom>AI模型配置</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <SelectInput
                source="default_model"
                label="默认AI模型"
                choices={[
                  { id: 'gpt-4o', name: 'GPT-4o' },
                  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
                ]}
                validate={required()}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <NumberInput
                source="knowledge_chat_temperature"
                label="知识库聊天温度"
                validate={required()}
                min={0}
                max={2}
                step={0.1}
                fullWidth
              />
            </Grid>
          </Grid>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>API配置</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextInput
                  source="openai_api_key"
                  label="OpenAI API Key"
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextInput
                  source="openai_api_base"
                  label="OpenAI API Base URL"
                  placeholder="https://api.openai.com/v1"
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <NumberInput
                  source="max_token_limit"
                  label="单次请求最大Token数"
                  validate={required()}
                  min={100}
                  max={32000}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>知识库配置</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <NumberInput
                  source="knowledge_chunk_size"
                  label="知识库切片大小"
                  validate={required()}
                  min={100}
                  max={2000}
                  defaultValue={500}
                  fullWidth
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <NumberInput
                  source="knowledge_chunk_overlap"
                  label="知识库切片重叠"
                  min={0}
                  max={500}
                  defaultValue={50}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </SimpleForm>
      </CardContent>
    </Card>
  );
};
