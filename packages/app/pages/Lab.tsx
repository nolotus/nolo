import "./Lab.css";
import React, { useState } from "react";
import { object, string, pipe, minLength, email, number, minValue, maxValue, optional } from "valibot";
import { useForm } from "form/useForm";
import { useAppSelector } from "app/store";
import { selectTheme } from "app/settings/settingSlice";
import Button from "render/web/ui/Button";
import { Input, NumberInput, PasswordInput } from "render/web/form/Input";
import { TextArea } from "render/web/form/TextArea";
import ToggleSwitch from "render/web/ui/ToggleSwitch";
import { Slider } from "render/web/form/Slider";

import {
  LuSearch,
  LuUser,
  LuLock,
  LuMail,
  LuPencil,
  LuTag,
  LuEye,
  LuSettings,
} from "react-icons/lu";
import { TagsInput } from "render/web/form/TagsInput";

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
  bio: string;
  tags: string;
  search: string;
}

const Lab = () => {
  const theme = useAppSelector(selectTheme);
  const form = useForm<FormData>({
    schema: object({
      username: pipe(string(), minLength(1, "请输入用户名")),
      email: pipe(string(), minLength(1, "请输入邮箱"), email("邮箱格式不正确")),
      password: pipe(string(), minLength(6, "密码至少6位")),
      // confirmPassword 和 search 在 schema 里但不强制校验（demo 表单）
      confirmPassword: optional(string(), ""),
      age: pipe(number(), minValue(1, "年龄必须大于0"), maxValue(150, "年龄不合理")),
      bio: optional(string(), ""),
      tags: optional(string(), ""),
      search: optional(string(), ""),
    }),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      age: 18,
      bio: "",
      tags: "",
      search: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    console.log("Form Data:", data);
    // 模拟异步提交
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <>
      

      <div className="lab-container">
        <header className="lab-header">
          <h1 className="lab-title">
            <span className="status-indicator" />
            组件展示实验室
          </h1>
          <p className="lab-description">
            这里展示了各种表单组件的功能和样式，包括不同尺寸、变体和状态的演示
          </p>
        </header>

        <div className="lab-grid">
          {/* 按钮组件演示 */}
          <section className="lab-section">
            <div className="section-header">
              <h2 className="section-title">
                <LuSettings size={20} className="section-title-icon" aria-hidden="true" />
                Button 组件
              </h2>
              <p className="section-description">
                支持多种变体、尺寸和状态的现代按钮组件
              </p>
            </div>

            <div className="size-demo">
              <div className="size-group">
                <div className="size-label">变体演示</div>
                <div className="variant-demo">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>

              <div className="size-group">
                <div className="size-label">尺寸演示</div>
                <div className="variant-demo">
                  <Button size="small">Small</Button>
                  <Button>Medium</Button>
                  <Button size="large">Large</Button>
                </div>
              </div>

              <div className="size-group">
                <div className="size-label">状态演示</div>
                <div className="variant-demo">
                  <Button icon={<LuSearch size={16} aria-hidden="true" />}>With Icon</Button>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button block>Block Button</Button>
                </div>
              </div>
            </div>
          </section>

          {/* 表单组件演示 */}
          <section className="lab-section">
            <div className="section-header">
              <h2 className="section-title">
                <LuPencil size={20} className="section-title-icon" aria-hidden="true" />
                表单组件
              </h2>
              <p className="section-description">
                完整的表单输入组件集合，支持验证和各种输入类型
              </p>
            </div>

            <form onSubmit={form.submit(onSubmit)} className="demo-form">
              <div className="demo-row">
                <Input
                  label="用户名"
                  placeholder="请输入用户名"
                  icon={<LuUser size={16} aria-hidden="true" />}
                  helperText="用户名长度为3-20个字符"
                  value={form.values.username}
                  onChange={(e) => form.set("username", e.target.value)}
                  error={!!form.errors.username}
                />

                <Input
                  label="邮箱"
                  type="email"
                  placeholder="请输入邮箱地址"
                  icon={<LuMail size={16} aria-hidden="true" />}
                  value={form.values.email}
                  onChange={(e) => form.set("email", e.target.value)}
                  error={!!form.errors.email}
                />
              </div>

              <div className="demo-row">
                <Input
                  label="密码"
                  password
                  placeholder="请输入密码"
                  icon={<LuLock size={16} aria-hidden="true" />}
                  helperText="密码长度至少6位"
                  value={form.values.password}
                  onChange={(e) => form.set("password", e.target.value)}
                  error={!!form.errors.password}
                />

                <NumberInput
                  label="年龄"
                  placeholder="请输入年龄"
                  helperText="请输入真实年龄"
                  value={form.values.age}
                  onChange={(v) => form.set("age", v)}
                />
              </div>

              <div className="demo-full-width">
                <TextArea
                  label="个人简介"
                  placeholder="请输入个人简介..."
                  icon={<LuPencil size={16} aria-hidden="true" />}
                  autoResize
                  helperText="简要介绍一下自己"
                  value={form.values.bio}
                  onChange={(e) => form.set("bio", e.target.value)}
                />
              </div>

              <div className="demo-full-width">
                <TagsInput
                  label="技能标签"
                  placeholder="输入技能标签，按回车添加"
                  maxTags={10}
                  helperText="最多可添加10个技能标签"
                  value={form.values.tags}
                  onChange={(v) => form.set("tags", v)}
                />
              </div>

              <div className="demo-buttons">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => console.log("Reset clicked")}
                >
                  重置
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  icon={<LuSearch size={16} aria-hidden="true" />}
                >
                  {loading ? "提交中..." : "提交表单"}
                </Button>
              </div>
            </form>
          </section>

          {/* 尺寸演示 */}
          <section className="lab-section">
            <div className="section-header">
              <h2 className="section-title">
                <LuEye size={20} className="section-title-icon" aria-hidden="true" />
                尺寸对比
              </h2>
              <p className="section-description">不同尺寸的组件对比展示</p>
            </div>

            <div className="size-demo">
              <div className="size-group">
                <div className="size-label">Small</div>
                <div className="demo-grid">
                  <Input
                    size="sm"
                    placeholder="Small input"
                    icon={<LuSearch size={14} aria-hidden="true" />}
                  />
                  <Button size="small">Small Button</Button>
                </div>
              </div>

              <div className="size-group">
                <div className="size-label">Medium (默认)</div>
                <div className="demo-grid">
                  <Input
                    placeholder="Medium input"
                    icon={<LuSearch size={16} aria-hidden="true" />}
                  />
                  <Button>Medium Button</Button>
                </div>
              </div>

              <div className="size-group">
                <div className="size-label">Standard (默认)</div>
                <div className="demo-grid">
                  <Input
                    placeholder="Standard input"
                    icon={<LuSearch size={16} aria-hidden="true" />}
                  />
                  <Button>Standard Button</Button>
                </div>
              </div>
            </div>
          </section>

          {/* 变体演示 */}
          <section className="lab-section">
            <div className="section-header">
              <h2 className="section-title">
                <LuTag size={20} className="section-title-icon" aria-hidden="true" />
                变体样式
              </h2>
              <p className="section-description">不同样式变体的组件展示</p>
            </div>

            <div className="size-demo">
              <div className="size-group">
                <div className="size-label">Default</div>
                <Input
                  variant="default"
                  placeholder="Default variant"
                  icon={<LuSearch size={16} aria-hidden="true" />}
                />
              </div>

              <div className="size-group">
                <div className="size-label">Filled</div>
                <Input
                  variant="filled"
                  placeholder="Filled variant"
                  icon={<LuSearch size={16} aria-hidden="true" />}
                />
              </div>

              <div className="size-group">
                <div className="size-label">Ghost</div>
                <Input
                  variant="ghost"
                  placeholder="Ghost variant"
                  icon={<LuSearch size={16} aria-hidden="true" />}
                />
              </div>

              <div className="size-group">
                <div className="size-label">Password Input</div>
                <Input
                  password
                  placeholder="Password input"
                  icon={<LuLock size={16} aria-hidden="true" />}
                />
              </div>

              <div className="size-group">
                <div className="size-label">TextArea with Auto Resize</div>
                <TextArea
                  autoResize
                  placeholder="This textarea will auto-resize as you type..."
                  variant="filled"
                />
              </div>
            </div>
          </section>
          {/* Toggle & Slider 演示 */}
          <section className="lab-section">
            <div className="section-header">
              <h2 className="section-title">
                <LuSettings size={20} className="section-title-icon" aria-hidden="true" />
                Toggle & Slider
              </h2>
              <p className="section-description">
                开关和滑块组件演示，支持不同状态和交互
              </p>
            </div>

            <div className="demo-grid">
              <div className="size-group">
                <div className="size-label">Toggle Switch</div>
                <div className="variant-demo" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                  <ToggleSwitch label="默认关闭" />
                  <ToggleSwitch defaultChecked label="默认开启" />
                  <ToggleSwitch disabled label="禁用状态" />
                  <ToggleSwitch defaultChecked disabled label="禁用且开启" />
                  <ToggleSwitch loading label="加载状态" />
                  <ToggleSwitch error label="错误状态" helperText="保存失败" />
                </div>
              </div>

              <div className="size-group" style={{ flex: 1 }}>
                <div className="size-label">Slider</div>
                <div className="variant-demo" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <SliderDemo />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

const SliderDemo = () => {
  const [val1, setVal1] = useState(30);
  const [val2, setVal2] = useState(60);
  const [val3, setVal3] = useState(2.5);

  return (
    <>
      <Slider
        label={`基础滑块 (当前值: ${val1})`}
        value={val1}
        onChange={setVal1}
      />

      <Slider
        label="带数值显示"
        showValue
        value={val2}
        onChange={setVal2}
      />

      <Slider
        label="禁用状态"
        disabled
        value={40}
        onChange={() => { }}
      />

      <Slider
        label="自定义范围 (0-10, step 0.5)"
        min={0}
        max={10}
        step={0.5}
        value={val3}
        showValue
        onChange={setVal3}
      />

      <Slider
        label="错误状态"
        error
        helperText="数值超出限制"
        value={90}
        showValue
        onChange={() => { }}
      />
    </>
  );
};

export default Lab;
