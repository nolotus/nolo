import React from "react";

interface SettingSectionProps {
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  children,
}) => (
  <>
    <section className="ChatConfigSettingSection">
      <div className="ChatConfigSettingSection__header">
        <h2 className="ChatConfigSettingSection__title">{title}</h2>
        <p className="ChatConfigSettingSection__description">{description}</p>
      </div>
      <div className="ChatConfigSettingSection__content">{children}</div>
    </section>

    
  </>
);

export default SettingSection;
