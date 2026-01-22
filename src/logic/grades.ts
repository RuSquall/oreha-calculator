import React from 'react';
import { MaterialName, CraftableItem } from '../types/data';

// 재료별 등급 매핑
export const MATERIAL_GRADES: Record<MaterialName | CraftableItem, string> = {
  '목재': '일반',
  '벌목의 가루': '일반',
  '부드러운 목재': '고급',
  '아비도스 융화 재료': '희귀',
  '튼튼한 목재': '희귀',
  '아비도스 목재': '희귀',
  '상급 아비도스 융화 재료': '영웅',
};

// Define styles for both light and dark themes
const GRADE_STYLES: {
  [key: string]: {
    light: React.CSSProperties;
    dark: React.CSSProperties;
  };
} = {
  '일반': {
    light: {
      background: 'linear-gradient(135deg, #e9ecef, #f8f9fa)',
      color: '#343a40',
    },
    dark: {
      background: 'linear-gradient(135deg,#232323,#575757)',
      color: '#ffffff',
    },
  },
  '고급': {
    light: {
      background: 'linear-gradient(135deg, #d4edda, #f0fff4)',
      color: '#155724',
    },
    dark: {
      background: 'linear-gradient(135deg,#18220b,#304911)',
      color: '#91fe02',
    },
  },
  '희귀': {
    light: {
      background: 'linear-gradient(135deg, #cce5ff, #e7f5ff)',
      color: '#004085',
    },
    dark: {
      background: 'linear-gradient(135deg,#111f2c,#113d5d)',
      color: '#00b5ff',
    },
  },
  '영웅': {
    light: {
      background: 'linear-gradient(135deg, #e2d9f3, #f3eefc)',
      color: '#563d7c',
    },
    dark: {
      background: 'linear-gradient(135deg,#261331,#480d5d)',
      color: '#bf00fe',
    },
  },
};

export const getItemGradeStyle = (
  itemName: MaterialName | CraftableItem,
  theme: 'light' | 'dark'
): React.CSSProperties => {
  const grade = MATERIAL_GRADES[itemName] || '일반';
  const themeStyle = GRADE_STYLES[grade]?.[theme] || GRADE_STYLES[grade]?.light;
  
  return {
    color: themeStyle.color, // Use the color appropriate for the current theme
    // Remove background property from here
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };
};

export const getImageBackgroundStyle = (
  itemName: MaterialName | CraftableItem,
  theme: 'light' | 'dark'
): React.CSSProperties => {
  const grade = MATERIAL_GRADES[itemName] || '일반';
  const darkStyle = GRADE_STYLES[grade]?.dark; // Always use the dark theme background for consistency

  return {
    background: darkStyle.background,
    borderRadius: '4px', // Optional: add some border-radius for aesthetics
    padding: '2px', // Optional: add some padding around the image
  };
};

export const getImagePath = (itemName: MaterialName | CraftableItem): string => {
  // Assuming images are in the public folder and named after the item
  // Replace spaces with underscores for file names
  const fileName = itemName.replace(/ /g, '_');
  return `/${fileName}.png`;
};
