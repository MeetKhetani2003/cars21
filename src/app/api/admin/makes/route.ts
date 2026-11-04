import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminRequest } from '../../../../server/auth';
import { getDb } from '../../../../server/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CarModelRecord = {
  id: string;
  name: string;
  body: string;
  years: number[];
  popular: boolean;
  status: 'active' | 'inactive';
};

export type MakeRecord = {
  id: string;
  name: string;
  country: string;
  code: string;
  popular: boolean;
  status: 'active' | 'inactive';
  models: CarModelRecord[];
  createdAt: string;
  updatedAt: string;
};

const ALL_YEARS_2022_2026 = [2022, 2023, 2024, 2025, 2026];

export const DEFAULT_MAKES: Array<Omit<MakeRecord, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Maruti Suzuki',
    country: 'India / Japan',
    code: 'MS',
    popular: true,
    status: 'active',
    models: [
      { id: 'swift', name: 'Swift', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'baleno', name: 'Baleno', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'brezza', name: 'Brezza', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'grand-vitara', name: 'Grand Vitara', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'fronx', name: 'Fronx', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'dzire', name: 'Dzire', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'ertiga', name: 'Ertiga', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'xl6', name: 'XL6', body: 'MUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'jimny', name: 'Jimny', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'invicto', name: 'Invicto', body: 'MUV', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'wagon-r', name: 'Wagon R', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'alto-k10', name: 'Alto K10', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'celerio', name: 'Celerio', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 's-presso', name: 'S-Presso', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'ignis', name: 'Ignis', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'ciaz', name: 'Ciaz', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'eeco', name: 'Eeco', body: 'Van', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'evx', name: 'eVX Electric', body: 'SUV', years: [2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    name: 'Hyundai',
    country: 'South Korea',
    code: 'HY',
    popular: true,
    status: 'active',
    models: [
      { id: 'creta', name: 'Creta', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'creta-n-line', name: 'Creta N Line', body: 'SUV', years: [2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'creta-ev', name: 'Creta EV', body: 'SUV', years: [2025, 2026], popular: true, status: 'active' },
      { id: 'venue', name: 'Venue', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'venue-n-line', name: 'Venue N Line', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'exter', name: 'Exter', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'verna', name: 'Verna', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'i20', name: 'i20', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'i20-n-line', name: 'i20 N Line', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'grand-i10-nios', name: 'Grand i10 Nios', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'aura', name: 'Aura', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'alcazar', name: 'Alcazar', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'tucson', name: 'Tucson', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'ioniq-5', name: 'Ioniq 5', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'kona-electric', name: 'Kona Electric', body: 'SUV', years: [2022, 2023, 2024], popular: false, status: 'active' },
    ]
  },
  {
    name: 'Tata',
    country: 'India',
    code: 'TA',
    popular: true,
    status: 'active',
    models: [
      { id: 'nexon', name: 'Nexon', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'nexon-ev', name: 'Nexon EV', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'punch', name: 'Punch', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'punch-ev', name: 'Punch EV', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'harrier', name: 'Harrier', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'safari', name: 'Safari', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'curvv', name: 'Curvv', body: 'SUV Coupe', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'curvv-ev', name: 'Curvv EV', body: 'SUV Coupe', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'altroz', name: 'Altroz', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'altroz-racer', name: 'Altroz Racer', body: 'Hatchback', years: [2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'tiago', name: 'Tiago', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'tiago-ev', name: 'Tiago EV', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'tigor', name: 'Tigor', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'tigor-ev', name: 'Tigor EV', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'sierra-ev', name: 'Sierra EV', body: 'SUV', years: [2025, 2026], popular: true, status: 'active' },
      { id: 'harrier-ev', name: 'Harrier EV', body: 'SUV', years: [2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    name: 'Mahindra',
    country: 'India',
    code: 'MH',
    popular: true,
    status: 'active',
    models: [
      { id: 'thar', name: 'Thar', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'thar-roxx', name: 'Thar Roxx', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'scorpio-n', name: 'Scorpio-N', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'scorpio-classic', name: 'Scorpio Classic', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'xuv700', name: 'XUV700', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'xuv-3xo', name: 'XUV 3XO', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'xuv300', name: 'XUV300', body: 'SUV', years: [2022, 2023, 2024], popular: false, status: 'active' },
      { id: 'xuv400-ev', name: 'XUV400 EV', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'bolero', name: 'Bolero', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'bolero-neo', name: 'Bolero Neo', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'bolero-neo-plus', name: 'Bolero Neo Plus', body: 'SUV', years: [2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'be-6e', name: 'BE 6e', body: 'SUV Coupe', years: [2025, 2026], popular: true, status: 'active' },
      { id: 'xev-9e', name: 'XEV 9e', body: 'SUV', years: [2025, 2026], popular: true, status: 'active' },
      { id: 'marazzo', name: 'Marazzo', body: 'MUV', years: [2022, 2023, 2024], popular: false, status: 'active' },
    ]
  },
  {
    name: 'Toyota',
    country: 'Japan',
    code: 'TY',
    popular: true,
    status: 'active',
    models: [
      { id: 'fortuner', name: 'Fortuner', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'fortuner-legender', name: 'Fortuner Legender', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'innova-crysta', name: 'Innova Crysta', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'innova-hycross', name: 'Innova Hycross', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'hyryder', name: 'Urban Cruiser Hyryder', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'glanza', name: 'Glanza', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'taisor', name: 'Urban Cruiser Taisor', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'rumion', name: 'Rumion', body: 'MUV', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'hilux', name: 'Hilux', body: 'Pickup', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'camry', name: 'Camry Hybrid', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'vellfire', name: 'Vellfire', body: 'MUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'land-cruiser-300', name: 'Land Cruiser 300', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Honda',
    country: 'Japan',
    code: 'HO',
    popular: true,
    status: 'active',
    models: [
      { id: 'city', name: 'City', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'city-ehev', name: 'City e:HEV Hybrid', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'elevate', name: 'Elevate', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'amaze', name: 'Amaze', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'wr-v', name: 'WR-V', body: 'SUV', years: [2022, 2023], popular: false, status: 'active' },
      { id: 'jazz', name: 'Jazz', body: 'Hatchback', years: [2022, 2023], popular: false, status: 'active' },
    ]
  },
  {
    name: 'Kia',
    country: 'South Korea',
    code: 'KA',
    popular: true,
    status: 'active',
    models: [
      { id: 'seltos', name: 'Seltos', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'sonet', name: 'Sonet', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'carens', name: 'Carens', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'ev6', name: 'EV6', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'ev9', name: 'EV9', body: 'SUV', years: [2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'carnival', name: 'Carnival', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'syros', name: 'Syros', body: 'SUV', years: [2025, 2026], popular: false, status: 'active' },
    ]
  },
  {
    name: 'Volkswagen',
    country: 'Germany',
    code: 'VW',
    popular: true,
    status: 'active',
    models: [
      { id: 'virtus', name: 'Virtus', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'taigun', name: 'Taigun', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'tiguan', name: 'Tiguan', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'golf-gti', name: 'Golf GTI', body: 'Hatchback', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'id4', name: 'ID.4 Electric', body: 'SUV', years: [2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'polo', name: 'Polo', body: 'Hatchback', years: [2022], popular: false, status: 'active' },
      { id: 'vento', name: 'Vento', body: 'Sedan', years: [2022], popular: false, status: 'active' },
    ]
  },
  {
    name: 'Skoda',
    country: 'Czech Republic',
    code: 'SK',
    popular: false,
    status: 'active',
    models: [
      { id: 'kushaq', name: 'Kushaq', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'slavia', name: 'Slavia', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'kylaq', name: 'Kylaq', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'kodiaq', name: 'Kodiaq', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'superb', name: 'Superb', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'octavia', name: 'Octavia', body: 'Sedan', years: [2022, 2023], popular: false, status: 'active' },
    ]
  },
  {
    name: 'MG',
    country: 'UK / China',
    code: 'MG',
    popular: false,
    status: 'active',
    models: [
      { id: 'hector', name: 'Hector', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'hector-plus', name: 'Hector Plus', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'astor', name: 'Astor', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'zs-ev', name: 'ZS EV', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'comet-ev', name: 'Comet EV', body: 'Hatchback', years: [2023, 2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'windsor-ev', name: 'Windsor EV', body: 'Crossover', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'gloster', name: 'Gloster', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Renault',
    country: 'France',
    code: 'RN',
    popular: false,
    status: 'active',
    models: [
      { id: 'kiger', name: 'Kiger', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'triber', name: 'Triber', body: 'MUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'kwid', name: 'Kwid', body: 'Hatchback', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'duster', name: 'Duster', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
    ]
  },
  {
    name: 'Nissan',
    country: 'Japan',
    code: 'NS',
    popular: false,
    status: 'active',
    models: [
      { id: 'magnite', name: 'Magnite', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'x-trail', name: 'X-Trail', body: 'SUV', years: [2024, 2025, 2026], popular: true, status: 'active' },
      { id: 'kicks', name: 'Kicks', body: 'SUV', years: [2022, 2023], popular: false, status: 'active' },
    ]
  },
  {
    name: 'BMW',
    country: 'Germany',
    code: 'BMW',
    popular: false,
    status: 'active',
    models: [
      { id: '3-series', name: '3 Series / Gran Limousine', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: '2-series-gc', name: '2 Series Gran Coupe', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: '5-series', name: '5 Series', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: '7-series', name: '7 Series', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'x1', name: 'X1', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'x3', name: 'X3', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'x5', name: 'X5', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'x7', name: 'X7', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'ix1', name: 'iX1 Electric', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'i4', name: 'i4 Electric', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'i7', name: 'i7 Electric', body: 'Sedan', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'ix', name: 'iX Electric', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'm340i', name: 'M340i xDrive', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'z4', name: 'Z4 Roadster', body: 'Roadster', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Mercedes-Benz',
    country: 'Germany',
    code: 'MB',
    popular: false,
    status: 'active',
    models: [
      { id: 'c-class', name: 'C-Class', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'e-class', name: 'E-Class', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 's-class', name: 'S-Class', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'a-class', name: 'A-Class Limousine', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'gla', name: 'GLA', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'glb', name: 'GLB', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'glc', name: 'GLC', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'gle', name: 'GLE', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'gls', name: 'GLS', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'g-class', name: 'G-Class G 63', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'eqb', name: 'EQB Electric', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'eqe-suv', name: 'EQE SUV', body: 'SUV', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'eqs', name: 'EQS Electric', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'maybach-s', name: 'Maybach S-Class', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Audi',
    country: 'Germany',
    code: 'AD',
    popular: false,
    status: 'active',
    models: [
      { id: 'a4', name: 'A4', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'a6', name: 'A6', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'a8-l', name: 'A8 L', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'q3', name: 'Q3', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'q3-sportback', name: 'Q3 Sportback', body: 'SUV Coupe', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'q5', name: 'Q5', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'q7', name: 'Q7', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'q8', name: 'Q8', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'q8-e-tron', name: 'Q8 e-tron Electric', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'e-tron-gt', name: 'e-tron GT', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Jeep',
    country: 'USA',
    code: 'JP',
    popular: false,
    status: 'active',
    models: [
      { id: 'compass', name: 'Compass', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'meridian', name: 'Meridian', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'wrangler', name: 'Wrangler', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'grand-cherokee', name: 'Grand Cherokee', body: 'SUV', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
    ]
  },
  {
    name: 'Volvo',
    country: 'Sweden',
    code: 'VO',
    popular: false,
    status: 'active',
    models: [
      { id: 'xc40-recharge', name: 'XC40 Recharge / EX40', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'c40-recharge', name: 'C40 Recharge / EC40', body: 'SUV Coupe', years: [2023, 2024, 2025, 2026], popular: false, status: 'active' },
      { id: 'xc60', name: 'XC60', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 'xc90', name: 'XC90', body: 'SUV', years: ALL_YEARS_2022_2026, popular: true, status: 'active' },
      { id: 's90', name: 'S90', body: 'Sedan', years: ALL_YEARS_2022_2026, popular: false, status: 'active' },
      { id: 'ex30', name: 'EX30 Electric', body: 'SUV', years: [2025, 2026], popular: false, status: 'active' },
    ]
  },
];

const modelSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().max(40).default('SUV'),
  years: z.array(z.number().int().min(1980).max(2100)).default(ALL_YEARS_2022_2026),
  popular: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

const makeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  country: z.string().trim().max(80).default(''),
  code: z.string().trim().max(10).default(''),
  popular: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  models: z.array(modelSchema).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const collection = db.collection('makes');
    const count = await collection.countDocuments();

    if (count === 0) {
      const now = new Date();
      const seedData = DEFAULT_MAKES.map(m => ({
        id: m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ...m,
        createdAt: now,
        updatedAt: now,
      }));
      await collection.insertMany(seedData);
    } else {
      // Auto-migrate / backfill any existing makes that lack models or have empty models
      const defaultMap = new Map(DEFAULT_MAKES.map(m => [m.name.toLowerCase().trim(), m.models]));
      const existing = await collection.find({}).toArray();
      const bulkOps: any[] = [];
      for (const doc of existing) {
        if (!Array.isArray(doc.models) || doc.models.length === 0) {
          const docNameKey = String(doc.name || '').toLowerCase().trim();
          const matchModels = defaultMap.get(docNameKey);
          if (matchModels && matchModels.length > 0) {
            bulkOps.push({
              updateOne: {
                filter: { _id: doc._id },
                set: { models: matchModels, updatedAt: new Date() }
              }
            });
          }
        }
      }
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps).catch(() => {});
      }
    }

    const makes = await collection.find({}).sort({ popular: -1, name: 1 }).toArray();
    return NextResponse.json({
      makes: makes.map(({ _id, ...make }) => ({
        ...make,
        id: make.id || String(_id),
        models: Array.isArray(make.models) ? make.models : [],
      }))
    });
  } catch {
    return NextResponse.json({ error: 'Vehicle companies are temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  const parsed = makeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid vehicle company details.' }, { status: 400 });
  try {
    const db = await getDb();
    const collection = db.collection('makes');
    const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await collection.findOne({
      $or: [
        { id: slug },
        { name: { $regex: new RegExp(`^${parsed.data.name}$`, 'i') } }
      ]
    });
    if (existing) return NextResponse.json({ error: 'A vehicle company with that name already exists.' }, { status: 409 });
    const now = new Date();
    const code = parsed.data.code || parsed.data.name.slice(0, 2).toUpperCase();
    const newMake = {
      id: slug,
      ...parsed.data,
      code,
      models: parsed.data.models.map(m => ({
        id: m.id || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: m.name,
        body: m.body || 'SUV',
        years: m.years && m.years.length ? m.years : ALL_YEARS_2022_2026,
        popular: Boolean(m.popular),
        status: m.status || 'active',
      })),
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(newMake);
    return NextResponse.json({ make: newMake }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Vehicle company could not be created.' }, { status: 503 });
  }
}
