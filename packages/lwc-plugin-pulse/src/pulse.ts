import { AutoscaleInfo, Logical, Time, DataChangedScope } from 'lightweight-charts';
import {
	LwcPluginPulsePriceAxisPaneView,
	LwcPluginPulseTimeAxisPaneView,
} from './axis-pane-view';
import { LwcPluginPulsePriceAxisView, LwcPluginPulseTimeAxisView } from './axis-view';
import { Point, LwcPluginPulseDataSource } from './data-source';
import { LwcPluginPulseOptions, defaultOptions } from './options';
import { LwcPluginPulsePaneView } from './pane-view';
import { PluginBase } from './plugin-base';

export class LwcPluginPulse
	extends PluginBase
	implements LwcPluginPulseDataSource
{
	_options: LwcPluginPulseOptions;
	_p1: Point;
	_p2: Point;
	_paneViews: LwcPluginPulsePaneView[];
	_timeAxisViews: LwcPluginPulseTimeAxisView[];
	_priceAxisViews: LwcPluginPulsePriceAxisView[];
	_priceAxisPaneViews: LwcPluginPulsePriceAxisPaneView[];
	_timeAxisPaneViews: LwcPluginPulseTimeAxisPaneView[];

	constructor(
		p1: Point,
		p2: Point,
		options: Partial<LwcPluginPulseOptions> = {}
	) {
		super();
		this._p1 = p1;
		this._p2 = p2;
		this._options = {
			...defaultOptions,
			...options,
		};
		this._paneViews = [new LwcPluginPulsePaneView(this)];
		this._timeAxisViews = [
			new LwcPluginPulseTimeAxisView(this, p1),
			new LwcPluginPulseTimeAxisView(this, p2),
		];
		this._priceAxisViews = [
			new LwcPluginPulsePriceAxisView(this, p1),
			new LwcPluginPulsePriceAxisView(this, p2),
		];
		this._priceAxisPaneViews = [new LwcPluginPulsePriceAxisPaneView(this, true)];
		this._timeAxisPaneViews = [new LwcPluginPulseTimeAxisPaneView(this, false)];
	}

	updateAllViews() {
		//* Use this method to update any data required by the
		//* views to draw.
		this._paneViews.forEach(pw => pw.update());
		this._timeAxisViews.forEach(pw => pw.update());
		this._priceAxisViews.forEach(pw => pw.update());
		this._priceAxisPaneViews.forEach(pw => pw.update());
		this._timeAxisPaneViews.forEach(pw => pw.update());
	}

	priceAxisViews() {
		//* Labels rendered on the price scale
		return this._priceAxisViews;
	}

	timeAxisViews() {
		//* labels rendered on the time scale
		return this._timeAxisViews;
	}

	paneViews() {
		//* rendering on the main chart pane
		return this._paneViews;
	}

	priceAxisPaneViews() {
		//* rendering on the price scale
		return this._priceAxisPaneViews;
	}

	timeAxisPaneViews() {
		//* rendering on the time scale
		return this._timeAxisPaneViews;
	}

	autoscaleInfo(
		startTimePoint: Logical,
		endTimePoint: Logical
	): AutoscaleInfo | null {
		//* Use this method to provide autoscale information if your primitive
		//* should have the ability to remain in view automatically.
		if (
			this._timeCurrentlyVisible(this.p1.time, startTimePoint, endTimePoint) ||
			this._timeCurrentlyVisible(this.p2.time, startTimePoint, endTimePoint)
		) {
			return {
				priceRange: {
					minValue: Math.min(this.p1.price, this.p2.price),
					maxValue: Math.max(this.p1.price, this.p2.price),
				},
			};
		}
		return null;
	}

	dataUpdated(_scope: DataChangedScope): void {
		//* This method will be called by PluginBase when the data on the
		//* series has changed.
	}

	_timeCurrentlyVisible(
		time: Time,
		startTimePoint: Logical,
		endTimePoint: Logical
	): boolean {
		const ts = this.chart.timeScale();
		const coordinate = ts.timeToCoordinate(time);
		if (coordinate === null) return false;
		const logical = ts.coordinateToLogical(coordinate);
		if (logical === null) return false;
		return logical <= endTimePoint && logical >= startTimePoint;
	}

	public get options(): LwcPluginPulseOptions {
		return this._options;
	}

	applyOptions(options: Partial<LwcPluginPulseOptions>) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}

	public get p1(): Point {
		return this._p1;
	}

	public get p2(): Point {
		return this._p2;
	}
}
