import {
	IChartApi,
	ISeriesApi,
	SeriesOptionsMap,
	Time,
} from 'lightweight-charts';
import { LwcPluginPulseOptions } from './options';

export interface Point {
	time: Time;
	price: number;
}

export interface LwcPluginPulseDataSource {
	chart: IChartApi;
	series: ISeriesApi<keyof SeriesOptionsMap>;
	options: LwcPluginPulseOptions;
	p1: Point;
	p2: Point;
}
