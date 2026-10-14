# Interceptor 切换数据源

目标：拦截以filter/**开头的所有请求，如果后面的方法以a开头就切换到db1，以b开头就切换到db2，其余使用默认数据源。

实现如下：
~~~
import com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Slf4j
public class DynamicDatasourceInterceptor implements HandlerInterceptor {

    /**
     * 在请求处理之前进行调用（Controller方法调用之前）
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String requestURI = request.getRequestURI();
        log.info("经过多数据源Interceptor,当前路径是{}", requestURI);
//        String headerDs = request.getHeader("ds");
//        Object sessionDs = request.getSession().getAttribute("ds");
        String s = requestURI.replaceFirst("/interceptor/", "");

        String dsKey = "master";
        if (s.startsWith("a")) {
            dsKey = "db1";
        } else if (s.startsWith("b")) {
            dsKey = "db2";
        } else {

        }

        DynamicDataSourceContextHolder.push(dsKey);
        return true;
    }

    /**
     * 请求处理之后进行调用，但是在视图被渲染之前（Controller方法调用之后）
     */
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {

    }

    /**
     * 在整个请求结束之后被调用，也就是在DispatcherServlet 渲染了对应的视图之后执行（主要是用于进行资源清理工作）
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        DynamicDataSourceContextHolder.clear();
    }

}
~~~

~~~
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MyWebAutoConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new DynamicDatasourceInterceptor()).addPathPatterns("/interceptor/**");
    }
}

~~~
对应源码： https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/all-datasource-sample

扩展：从request中还能获取到很多东西，如header和session，是否同理可以根据自己业务需求根据header值和session里对应的用户来动态设置和切换数据源？

