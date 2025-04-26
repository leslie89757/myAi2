import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  TextInput,
  Create,
  Edit,
  SimpleForm,
  DateField,
  EditButton,
  DeleteButton,
  required,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  SearchInput,
  SelectInput
} from 'react-admin';
import { Card, CardContent, Box } from '@mui/material';

// 提示词模板列表操作
const ListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

// 提示词模板筛选器
const PromptFilter = [
  <SearchInput key="q" source="q" placeholder="搜索名称或类型" alwaysOn={true} />,
  <SelectInput key="type" source="type" label="类型" choices={[
    { id: 'system', name: '系统默认' },
    { id: 'custom', name: '自定义' },
  ]} alwaysOn={true} />
];

// 提示词模板列表视图
export const PromptList = props => (
  <List
    {...props}
    actions={<ListActions />}
    filters={PromptFilter}
  >
    <Datagrid>
      <TextField source="id" label="ID" />
      <TextField source="name" label="名称" />
      <TextField source="content" label="内容" />
      <TextField source="type" label="类型" />
      <TextField source="isDefault" label="默认模板" />
      <DateField source="createdAt" label="创建时间" showTime />
      <DateField source="updatedAt" label="更新时间" showTime />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

// 创建提示词模板表单
export const PromptCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="name" label="名称" validate={required()} fullWidth />
      <SelectInput source="type" label="类型" choices={[
        { id: 'system', name: '系统默认' },
        { id: 'custom', name: '自定义' },
      ]} validate={required()} defaultValue="system" fullWidth />
      <SelectInput source="isDefault" label="默认模板" choices={[
        { id: true, name: '是' },
        { id: false, name: '否' },
      ]} defaultValue={false} fullWidth />
      <TextInput
        source="content"
        label="提示词内容"
        validate={required()}
        multiline
        rows={10}
        fullWidth
      />
    </SimpleForm>
  </Create>
);

// 修改提示词模板表单
export const PromptEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="id" label="ID" disabled />
      <TextInput source="name" label="名称" validate={required()} fullWidth />
      <SelectInput source="type" label="类型" choices={[
        { id: 'system', name: '系统默认' },
        { id: 'custom', name: '自定义' },
      ]} validate={required()} fullWidth />
      <SelectInput source="isDefault" label="默认模板" choices={[
        { id: true, name: '是' },
        { id: false, name: '否' },
      ]} defaultValue={false} fullWidth />
      <TextInput
        source="content"
        label="提示词内容"
        validate={required()}
        multiline
        rows={10}
        fullWidth
      />
      <DateField source="createdAt" label="创建时间" showTime />
      <DateField source="updatedAt" label="更新时间" showTime />
    </SimpleForm>
  </Edit>
);
