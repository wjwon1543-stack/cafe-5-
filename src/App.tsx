/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';

// 음료 메뉴 및 기본 가격 정보 정의
interface DrinkMenu {
  name: string;
  price: number;
}

const DRINK_LIST: DrinkMenu[] = [
  { name: '아메리카노', price: 3500 },
  { name: '카페라떼', price: 4000 },
  { name: '카페모카', price: 4500 },
  { name: '바닐라라떼', price: 4500 },
  { name: '녹차라떼', price: 4500 },
];

// 사이즈 옵션 및 추가 금액 정의
type SizeType = 'S' | 'M' | 'L';

interface SizeOption {
  value: SizeType;
  label: string;
  extraPrice: number;
}

const SIZE_OPTIONS: SizeOption[] = [
  { value: 'S', label: 'S +0원', extraPrice: 0 },
  { value: 'M', label: 'M +500원', extraPrice: 500 },
  { value: 'L', label: 'L +1,000원', extraPrice: 1000 },
];

// 추가 옵션 및 추가 금액 정의
interface ExtraOption {
  id: string;
  name: string;
  label: string;
  extraPrice: number;
}

const EXTRA_OPTIONS: ExtraOption[] = [
  { id: 'opt-shot', name: '샷 추가', label: '샷 추가 +500원', extraPrice: 500 },
  { id: 'opt-cream', name: '크림 추가', label: '크림 추가 +500원', extraPrice: 500 },
  { id: 'opt-syrup', name: '시럽 추가', label: '시럽 추가 +300원', extraPrice: 300 },
  { id: 'opt-decaf', name: '디카페인', label: '디카페인 +0원', extraPrice: 0 },
];

// 게시판에 표시할 주문 내역 타입 정의
interface OrderRecord {
  id: number;
  customerName: string;
  phone: string;
  drinkName: string;
  size: SizeType;
  extraOptions: string[];
  quantity: number;
  requestNote: string;
  totalPrice: number;
  createdAt: string;
}

interface SupabaseOrder {
  id: number;
  customer_name: string;
  drink_name: string;
  size: SizeType;
  extra_options: string[];
  quantity: number;
  request_note: string;
  total_price: number;
  created_at: string;
}

const toOrderRecord = (order: SupabaseOrder): OrderRecord => ({
  id: order.id,
  customerName: order.customer_name,
  phone: '',
  drinkName: order.drink_name,
  size: order.size,
  extraOptions: order.extra_options,
  quantity: order.quantity,
  requestNote: order.request_note,
  totalPrice: order.total_price,
  createdAt: new Date(order.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }),
});

export default function App() {
  // 1. 이름 (필수)
  const [customerName, setCustomerName] = useState<string>('');
  // 2. 전화번호
  const [phone, setPhone] = useState<string>('');
  // 3. 음료 선택
  const [selectedDrink, setSelectedDrink] = useState<string>('');
  // 4. 사이즈 (기본값: 'M')
  const [selectedSize, setSelectedSize] = useState<SizeType>('M');
  // 5. 추가 옵션 (선택된 옵션 이름 배열)
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  // 6. 수량 (최소 1, 최대 10, 기본값 1)
  const [quantity, setQuantity] = useState<number>(1);
  // 7. 요청사항
  const [requestNote, setRequestNote] = useState<string>('');

  // 사용자 조작 여부 (초기 상태에서 예상 금액 0원 표시용)
  const [isCalculationActive, setIsCalculationActive] = useState<boolean>(false);

  // 유효성 검사 알림 메시지 상태 ("이름을 입력해주세요" / "음료를 선택해주세요")
  const [alertMessage, setAlertMessage] = useState<string>('');

  // 주문 완료 확인 메시지 상태
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');

  // 카페 주문 게시판 목록 상태
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersMessage, setOrdersMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력칸 포커스 이동을 위한 ref
  const nameInputRef = useRef<HTMLInputElement>(null);
  const drinkSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!supabase) {
      setOrdersMessage('Vercel 환경 변수에 Supabase URL과 anon key를 설정해주세요.');
      return;
    }

    const client = supabase;
    let isActive = true;

    const loadOrders = async () => {
      const { data, error } = await client
        .from('orders')
        .select('id, customer_name, drink_name, size, extra_options, quantity, request_note, total_price, created_at')
        .order('created_at', { ascending: false });

      if (!isActive) return;
      if (error) {
        setOrdersMessage('주문 목록을 불러오지 못했습니다. Supabase 테이블과 권한 설정을 확인해주세요.');
        return;
      }

      setOrders((data as SupabaseOrder[]).map(toOrderRecord));
      setOrdersMessage('');
    };

    void loadOrders();
    return () => {
      isActive = false;
    };
  }, []);

  // 선택한 음료의 기본 가격 구하기
  const drinkPrice =
    DRINK_LIST.find((item) => item.name === selectedDrink)?.price ?? 0;

  // 선택한 사이즈의 추가 금액 구하기
  const sizePrice =
    SIZE_OPTIONS.find((item) => item.value === selectedSize)?.extraPrice ?? 0;

  // 선택한 추가 옵션들의 총합 금액 구하기
  const extrasPrice = selectedExtras.reduce((sum, extraName) => {
    const found = EXTRA_OPTIONS.find((opt) => opt.name === extraName);
    return sum + (found ? found.extraPrice : 0);
  }, 0);

  // 수량 범위 보정 (1 ~ 10)
  const validQuantity = Math.min(10, Math.max(1, Number.isNaN(quantity) ? 1 : quantity));

  // 실시간 예상 금액 계산
  // 음료를 선택했거나 옵션/사이즈/수량을 변경한 경우 실시간 합산, 초기/초기화 상태면 0원 표시
  const estimatedPrice =
    selectedDrink !== '' || isCalculationActive || selectedExtras.length > 0
      ? (drinkPrice + sizePrice + extrasPrice) * validQuantity
      : 0;

  // 추가 옵션 체크박스 변경 핸들러
  const handleExtraChange = (optionName: string) => {
    setIsCalculationActive(true);
    setAlertMessage('');
    setSelectedExtras((prev) =>
      prev.includes(optionName)
        ? prev.filter((item) => item !== optionName)
        : [...prev, optionName]
    );
  };

  // 수량 변경 핸들러 (최소 1, 최대 10 제한)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCalculationActive(true);
    setAlertMessage('');
    const rawValue = parseInt(e.target.value, 10);
    if (Number.isNaN(rawValue)) {
      setQuantity(1);
      return;
    }
    const clampedValue = Math.min(10, Math.max(1, rawValue));
    setQuantity(clampedValue);
  };

  // 주문하기 버튼 클릭 시 실행되는 핸들러
  const handleOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlertMessage('');

    // 이름이 비어있으면 "이름을 입력해주세요" 알림
    if (!customerName.trim()) {
      setAlertMessage('이름을 입력해주세요');
      setConfirmationMessage('');
      nameInputRef.current?.focus();
      return;
    }

    // 음료를 선택하지 않았으면 "음료를 선택해주세요" 알림
    if (!selectedDrink) {
      setAlertMessage('음료를 선택해주세요');
      setConfirmationMessage('');
      drinkSelectRef.current?.focus();
      return;
    }

    if (!supabase) {
      setAlertMessage('Supabase 연결 설정이 필요합니다.');
      setConfirmationMessage('');
      return;
    }

    // 최종 주문 금액 계산
    const finalTotal = (drinkPrice + sizePrice + extrasPrice) * validQuantity;

    // 추가 옵션 문자열 포맷팅: 선택된 옵션이 있으면 "(샷 추가)" 형태로 표시
    const optionText =
      selectedExtras.length > 0 ? ` (${selectedExtras.join(', ')})` : '';

    // 주문 확인 메시지 생성
    // 예: "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!"
    const message = `${customerName.trim()}님, ${selectedDrink} ${selectedSize}사이즈${optionText} ${validQuantity}잔, 총 ${finalTotal.toLocaleString('ko-KR')}원 주문이 접수되었습니다!`;
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        drink_name: selectedDrink,
        size: selectedSize,
        extra_options: selectedExtras,
        quantity: validQuantity,
        request_note: requestNote.trim(),
        total_price: finalTotal,
      })
      .select('id, customer_name, drink_name, size, extra_options, quantity, request_note, total_price, created_at')
      .single();
    setIsSubmitting(false);

    if (error) {
      setAlertMessage('주문 저장에 실패했습니다. Supabase 테이블과 권한 설정을 확인해주세요.');
      setConfirmationMessage('');
      return;
    }

    setOrders((prev) => [toOrderRecord(data as SupabaseOrder), ...prev]);
    setConfirmationMessage(message);
  };

  // 다시 작성 버튼 클릭 시 모든 입력과 금액 초기화
  const handleReset = () => {
    setCustomerName('');
    setPhone('');
    setSelectedDrink('');
    setSelectedSize('M');
    setSelectedExtras([]);
    setQuantity(1);
    setRequestNote('');
    setIsCalculationActive(false);
    setAlertMessage('');
    setConfirmationMessage('');
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] py-8 px-4">
      {/* 최대 너비 520px, 가운데 정렬 컨테이너 */}
      <main className="max-w-[520px] mx-auto">
        {/* 주문서 카드: 둥근 모서리, 부드러운 그림자 */}
        <section className="bg-white/90 rounded-2xl shadow-[0_8px_28px_rgba(107,66,38,0.10)] border border-[#eadfd2] p-6 sm:p-8">
          {/* 페이지 상단: 카페 로고, 카페 이름, 부제 */}
          <header className="text-center mb-7 pb-5 border-b border-[#efe6dc]">
            <div className="text-5xl mb-2 select-none" role="img" aria-label="카페 로고">
              ☕
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#6b4226] tracking-tight">
              바이브 카페
            </h1>
            <p className="text-sm text-[#8c674e] mt-1.5">
              당신의 하루에 바이브를 더하다
            </p>
          </header>

          {/* 음료 주문서 폼 */}
          <form onSubmit={handleOrderSubmit} noValidate className="space-y-5">
            {/* 1. 이름 (필수, text) */}
            <div>
              <label
                htmlFor="customer-name"
                className="block text-sm font-semibold text-[#54331d] mb-1.5"
              >
                이름 <span className="text-[#b84a27]">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="customer-name"
                name="customerName"
                type="text"
                required
                placeholder="주문자 성함을 입력해주세요 (예: 홍길동)"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (alertMessage) setAlertMessage('');
                }}
                className="cafe-input"
              />
            </div>

            {/* 2. 전화번호 (tel) */}
            <div>
              <label
                htmlFor="customer-phone"
                className="block text-sm font-semibold text-[#54331d] mb-1.5"
              >
                전화번호
              </label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="cafe-input"
              />
            </div>

            {/* 3. 음료 선택 (드롭다운) */}
            <div>
              <label
                htmlFor="drink-select"
                className="block text-sm font-semibold text-[#54331d] mb-1.5"
              >
                음료 선택 <span className="text-[#b84a27]">*</span>
              </label>
              <select
                ref={drinkSelectRef}
                id="drink-select"
                name="drink"
                value={selectedDrink}
                onChange={(e) => {
                  setSelectedDrink(e.target.value);
                  setIsCalculationActive(true);
                  if (alertMessage) setAlertMessage('');
                }}
                className="cafe-input cursor-pointer"
              >
                <option value="">-- 음료를 선택해주세요 --</option>
                {DRINK_LIST.map((drink) => (
                  <option key={drink.name} value={drink.name}>
                    {drink.name} {drink.price.toLocaleString('ko-KR')}원
                  </option>
                ))}
              </select>
            </div>

            {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
            <div>
              <span className="block text-sm font-semibold text-[#54331d] mb-2">
                사이즈
              </span>
              <div className="flex flex-wrap items-center gap-4 bg-[#faf6f0] p-3 rounded-[8px] border border-[#ebe0d2]">
                {SIZE_OPTIONS.map((sizeObj) => {
                  const radioId = `size-${sizeObj.value.toLowerCase()}`;
                  return (
                    <div key={sizeObj.value} className="flex items-center gap-1.5">
                      <input
                        id={radioId}
                        type="radio"
                        name="size"
                        value={sizeObj.value}
                        checked={selectedSize === sizeObj.value}
                        onChange={() => {
                          setSelectedSize(sizeObj.value);
                          setIsCalculationActive(true);
                        }}
                        className="cafe-choice w-4 h-4 cursor-pointer"
                      />
                      <label
                        htmlFor={radioId}
                        className="text-sm text-[#4a2e1b] cursor-pointer select-none"
                      >
                        {sizeObj.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
            <div>
              <span className="block text-sm font-semibold text-[#54331d] mb-2">
                추가 옵션
              </span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 bg-[#faf6f0] p-3 rounded-[8px] border border-[#ebe0d2]">
                {EXTRA_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center gap-1.5">
                    <input
                      id={option.id}
                      type="checkbox"
                      name="extraOptions"
                      value={option.name}
                      checked={selectedExtras.includes(option.name)}
                      onChange={() => handleExtraChange(option.name)}
                      className="cafe-choice w-4 h-4 cursor-pointer"
                    />
                    <label
                      htmlFor={option.id}
                      className="text-sm text-[#4a2e1b] cursor-pointer select-none"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
            <div>
              <label
                htmlFor="drink-quantity"
                className="block text-sm font-semibold text-[#54331d] mb-1.5"
              >
                수량 (1 ~ 10잔)
              </label>
              <input
                id="drink-quantity"
                name="quantity"
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={handleQuantityChange}
                className="cafe-input tabular-nums"
              />
            </div>

            {/* 7. 요청사항 (textarea) */}
            <div>
              <label
                htmlFor="order-request"
                className="block text-sm font-semibold text-[#54331d] mb-1.5"
              >
                요청사항
              </label>
              <textarea
                id="order-request"
                name="requestNote"
                rows={3}
                placeholder="얼음 적게, 시럽 별도 등 요청사항을 적어주세요."
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                className="cafe-input resize-y"
              />
            </div>

            {/* 필수 입력 누락 시 알림 배너 */}
            {alertMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#fff3e0] border border-[#ffb74d] text-[#bf360c] text-sm font-semibold text-center"
              >
                {alertMessage}
              </div>
            )}

            {/* 예상 금액 표시 영역: 주문하기 버튼 바로 위에 큰 글씨(24px), 갈색, 굵게, 가운데 정렬 */}
            <div className="pt-2 pb-1">
              <p className="text-[24px] text-[#6b4226] font-bold text-center tabular-nums">
                예상 금액: {estimatedPrice.toLocaleString('ko-KR')}원
              </p>
            </div>

            {/* 8. 주문하기 버튼 & 9. 다시 작성 버튼 */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-[8px] bg-[#6b4226] hover:bg-[#825232] text-white font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                {isSubmitting ? '저장 중...' : '주문하기'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-5 rounded-[8px] bg-[#efe7dd] hover:bg-[#e4d7c7] text-[#54331d] font-semibold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                다시 작성
              </button>
            </div>
          </form>

          {/* 주문 확인 메시지: 연두색 배경, 초록 글씨, 둥근 모서리 */}
          {confirmationMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 p-4 rounded-xl bg-[#e3f6df] border border-[#b7e1b0] text-[#1f6b24] font-semibold text-sm sm:text-base text-center leading-relaxed"
            >
              {confirmationMessage}
            </div>
          )}
        </section>

        {/* 카페 주문 현황 게시판 영역 */}
        <section className="mt-6 bg-white/90 rounded-2xl shadow-[0_6px_22px_rgba(107,66,38,0.08)] border border-[#eadfd2] p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#efe6dc]">
            <h2 className="text-lg font-bold text-[#6b4226]">
              주문 접수 게시판
            </h2>
            <span className="text-xs text-[#8c674e] tabular-nums">
              총 {orders.length}건
            </span>
          </div>

          {ordersMessage && (
            <p role="status" className="mb-4 text-sm text-[#8c674e]">
              {ordersMessage}
            </p>
          )}

          <ul className="divide-y divide-[#f2eae0]">
            {orders.map((order) => {
              const extraLabel =
                order.extraOptions.length > 0
                  ? ` (${order.extraOptions.join(', ')})`
                  : '';
              return (
                <li key={order.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-[#3d2516]">
                      {order.customerName}님 · {order.drinkName} {order.size}사이즈
                      {extraLabel} {order.quantity}잔
                    </p>
                    <span className="text-sm font-bold text-[#6b4226] tabular-nums shrink-0">
                      {order.totalPrice.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[#8c674e]">
                    <span>
                      {order.requestNote
                        ? `요청: ${order.requestNote}`
                        : '요청사항 없음'}
                    </span>
                    <span>{order.createdAt}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
