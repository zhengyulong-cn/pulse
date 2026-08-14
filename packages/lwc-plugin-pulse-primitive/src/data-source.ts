import {
	IChartApi,
	ISeriesApi,
	SeriesOptionsMap,
	Time,
} from 'lightweight-charts';
import { PulseprimitiveOptions } from './options';

export interface Point {
	time: Time;
	price: number;
}

export interface PulseprimitiveDataSource {
	chart: IChartApi;
	series: ISeriesApi<keyof SeriesOptionsMap>;
	options: PulseprimitiveOptions;
	p1: Point;
	p2: Point;
}
