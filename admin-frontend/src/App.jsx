import React from 'react';
import { Admin, Resource } from 'react-admin';
import { dataProvider } from './providers/dataProvider';
import { authProvider } from './providers/authProvider';

// 导入资源
import UserIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

// 导入组件(这些将在后续文件中实现)
import { UserList, UserEdit, UserCreate } from './resources/users';
import { SystemConfigEdit } from './resources/systemConfig';
import { PromptList, PromptEdit, PromptCreate } from './resources/prompts';

// 定义应用程序标题和说明
const App = () => (
  <Admin
    title="MyAI 后台管理系统"
    dataProvider={dataProvider}
    authProvider={authProvider}
    dashboard={() => <div>欢迎使用 MyAI 后台管理系统</div>}
  >
    <Resource
      name="users"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
      icon={UserIcon}
      options={{ label: '用户管理' }}
    />
    <Resource
      name="config"
      edit={SystemConfigEdit}
      icon={SettingsIcon}
      options={{ label: '系统配置' }}
    />
    <Resource
      name="prompts"
      list={PromptList}
      edit={PromptEdit}
      create={PromptCreate}
      icon={FormatQuoteIcon}
      options={{ label: '提示词模板' }}
    />
  </Admin>
);

export default App;
