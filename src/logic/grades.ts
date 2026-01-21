// src/logic/grades.ts

import { MaterialName, CraftableItem } from '../types/data';

// 등급별 배경 CSS 그라데이션
export const GRADE_BACKGROUNDS: Record<string, string> = {
  '일반': 'linear-gradient(135deg,#232323,#575757)',
  '고급': 'linear-gradient(135deg,#18220b,#304911)',
  '희귀': 'linear-gradient(135deg,#111f2c,#113d5d)',
  '영웅': 'linear-gradient(135deg,#261331,#480d5d)',
};

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

export const getItemGradeStyle = (itemName: MaterialName | CraftableItem): React.CSSProperties => {
  const grade = MATERIAL_GRADES[itemName];
  const background = GRADE_BACKGROUNDS[grade];
  return {
    background: background,
    borderRadius: '4px', // 이미지 테두리 둥글게
    padding: '2px',      // 이미지와 배경 사이 여백
    display: 'inline-flex', // 이미지와 텍스트 정렬
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };
};
