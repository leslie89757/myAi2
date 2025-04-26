import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  Create,
  Edit,
  SimpleForm,
  TextInput,
  PasswordInput,
  SelectInput,
  DateTimeInput,
  required,
  email,
  minLength,
  EditButton,
  DeleteButton,
  ShowButton,
  FilterButton,
  FilterForm,
  FilterList,
  FilterListItem,
  CreateButton,
  ExportButton,
  TopToolbar,
  SearchInput
} from 'react-admin';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Card, CardContent, Box, Typography } from '@mui/material';

// 用户列表操作
const ListActions = () => (
  <TopToolbar>
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

// 用户筛选器
const UserFilter = [    
  <SelectInput key="status" source="status" label="状态" choices={[
    { id: 'active', name: '活跃' },
    { id: 'blocked', name: '已封禁' },
  ]} alwaysOn={true} />,
  <SelectInput key="role" source="role" label="角色" choices={[
    { id: 'user', name: '普通用户' },
    { id: 'admin', name: '管理员' },
  ]} alwaysOn={true} />,
  <SearchInput key="q" source="q" placeholder="搜索用户名或邮箱" alwaysOn={true} />
];

// 用户状态切换组件
const StatusToggleField = ({ record }) => {
  return record?.status === 'active' ? (
    <LockOpenIcon color="success" titleAccess="活跃" />
  ) : (
    <LockIcon color="error" titleAccess="已封禁" />
  );
};

// 用户列表视图
export const UserList = props => (
  <List
    {...props}
    actions={<ListActions />}
    filters={UserFilter}
  >
    <Datagrid>
      <TextField source="id" label="ID" />
      <TextField source="username" label="用户名" />
      <EmailField source="email" label="邮箱" />
      <TextField source="role" label="角色" />
      <StatusToggleField source="status" label="状态" />
      <DateField source="createdAt" label="创建时间" showTime />
      <DateField source="updatedAt" label="更新时间" showTime />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

// 创建用户表单
export const UserCreate = props => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="username" label="用户名" validate={[required()]} fullWidth />
      <TextInput source="email" label="邮箱" validate={[required(), email()]} fullWidth />
      <PasswordInput source="password" label="密码" validate={[required(), minLength(6)]} fullWidth />
      <SelectInput source="role" label="角色" choices={[
        { id: 'user', name: '普通用户' },
        { id: 'admin', name: '管理员' },
      ]} validate={[required()]} defaultValue="user" fullWidth />
      <SelectInput source="status" label="状态" choices={[
        { id: 'active', name: '活跃' },
        { id: 'blocked', name: '已封禁' },
      ]} validate={[required()]} defaultValue="active" fullWidth />
    </SimpleForm>
  </Create>
);

// 修改用户表单
export const UserEdit = props => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="id" label="ID" disabled />
      <TextInput source="username" label="用户名" validate={[required()]} fullWidth />
      <TextInput source="email" label="邮箱" validate={[required(), email()]} fullWidth />
      <PasswordInput source="password" label="密码（留空则不修改）" validate={minLength(6)} fullWidth />
      <SelectInput source="role" label="角色" choices={[
        { id: 'user', name: '普通用户' },
        { id: 'admin', name: '管理员' },
      ]} validate={[required()]} fullWidth />
      <SelectInput source="status" label="状态" choices={[
        { id: 'active', name: '活跃' },
        { id: 'blocked', name: '已封禁' },
      ]} validate={[required()]} fullWidth />
      <DateTimeInput source="createdAt" label="创建时间" disabled fullWidth />
      <DateTimeInput source="updatedAt" label="更新时间" disabled fullWidth />
    </SimpleForm>
  </Edit>
);
