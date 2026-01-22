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
  
  // Style for the current theme (mainly for text color)
  const themeStyle = GRADE_STYLES[grade]?.[theme] || GRADE_STYLES[grade]?.light;
  
  // Style for the dark theme (for the static background)
  const darkStyle = GRADE_STYLES[grade]?.dark;

  // Combine styles: static background, dynamic color, and layout styles
  return {
    background: darkStyle.background, // Always use the dark theme background
    color: themeStyle.color, // Use the color appropriate for the current theme
    padding: '2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };
};
